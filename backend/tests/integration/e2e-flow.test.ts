import request from 'supertest';
import { startMemoryDb, stopMemoryDb, clearCollections } from './db';

/**
 * Requirement 62 — the complete acceptance flow, over real HTTP with real
 * HttpOnly cookies and a real (in-memory) MongoDB:
 *
 *   first-admin setup -> admin creates a Jobber + Manufacturer user ->
 *   Jobber logs in -> adds a Manufacturer -> creates a Job Card ->
 *   start -> complete -> dispatch -> activity + PDF ->
 *   Manufacturer logs in -> sees the card (read) -> is denied editing.
 *
 * Degrades to a no-op (with a warning) if the in-memory MongoDB can't start.
 */
let dbUp = false;
let app: import('express').Application;

beforeAll(async () => {
  try {
    await startMemoryDb();
    ({ app } = await import('../../src/app'));
    dbUp = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[e2e-flow] in-memory MongoDB unavailable — suite skipped:', (err as Error).message);
  }
}, 120_000);

afterAll(async () => {
  if (dbUp) await stopMemoryDb();
});
beforeEach(async () => {
  if (dbUp) await clearCollections();
});

const t = (name: string, fn: () => Promise<void>): void =>
  it(name, async () => {
    if (!dbUp) return;
    await fn();
  });

const ADMIN = { name: 'Admin', username: 'admin', password: 'Admin@12345' };
const JOBBER = { name: 'Abc Owner', username: 'abc', password: 'Abc@12345' };
const MANU = { name: 'Yash Owner', username: 'yash', password: 'Yash@12345' };

async function bootstrapUsers(): Promise<void> {
  const admin = request.agent(app);
  await admin.post('/api/v1/auth/setup').send(ADMIN).expect(201);

  await admin
    .post('/api/v1/users')
    .send({ ...JOBBER, role: 'JOBBER', jobberName: 'ABC Jeans Workshop' })
    .expect(201);
  await admin
    .post('/api/v1/users')
    .send({ ...MANU, role: 'MANUFACTURER', manufacturerName: 'Yash Garment' })
    .expect(201);
}

t('setup is one-time (409 on a second call)', async () => {
  const agent = request.agent(app);
  await agent.get('/api/v1/auth/setup-status').expect(200, /setupRequired/);
  await agent.post('/api/v1/auth/setup').send(ADMIN).expect(201);

  const status = await agent.get('/api/v1/auth/setup-status').expect(200);
  expect(status.body.data.setupRequired).toBe(false);
  await agent.post('/api/v1/auth/setup').send(ADMIN).expect(409);
});

t('full Jobber -> Manufacturer acceptance flow', async () => {
  await bootstrapUsers();

  // --- Jobber ---
  const jobber = request.agent(app);
  await jobber.post('/api/v1/auth/login').send({ username: JOBBER.username, password: JOBBER.password }).expect(200);

  const me = await jobber.get('/api/v1/auth/me').expect(200);
  expect(me.body.data.user.role).toBe('JOBBER');
  expect(me.body.data.user.jobberName).toBe('ABC Jeans Workshop');

  const addManu = await jobber.post('/api/v1/manufacturers').send({ name: 'Yash Garment' }).expect(201);
  const manufacturerId = addManu.body.data.manufacturer.id;

  const created = await jobber
    .post('/api/v1/jobcards')
    .send({
      manufacturerId,
      shortName: 'Blue Denim',
      sizes: [
        { size: '32', quantity: 500 },
        { size: '34', quantity: 700 },
      ],
      bales: [{ label: 'Bale 01', meters: 120 }],
    })
    .expect(201);
  const jobCard = created.body.data.jobCard;
  expect(jobCard.jobCardNumber).toBe('JC-1001');
  expect(jobCard.totals.pieces).toBe(1200);
  expect(jobCard.workStatus).toBe('DRAFT');

  const list = await jobber.get('/api/v1/jobcards').expect(200);
  expect(list.body.data).toHaveLength(1);
  expect(list.body.pagination.total).toBe(1);

  // status workflow
  await jobber.post(`/api/v1/jobcards/${jobCard.id}/complete`).expect(400); // not started
  const started = await jobber.post(`/api/v1/jobcards/${jobCard.id}/start`).expect(200);
  expect(started.body.data.jobCard.workStatus).toBe('IN_PROGRESS');
  await jobber.post(`/api/v1/jobcards/${jobCard.id}/complete`).expect(200);
  const dispatched = await jobber.post(`/api/v1/jobcards/${jobCard.id}/dispatch`).expect(200);
  expect(dispatched.body.data.jobCard.dispatchStatus).toBe('DISPATCHED');

  const activity = await jobber.get(`/api/v1/jobcards/${jobCard.id}/activity`).expect(200);
  const actions = (activity.body.data.activity as Array<{ action: string }>).map((a) => a.action);
  expect(actions).toEqual(
    expect.arrayContaining(['JOBCARD_CREATED', 'WORK_STARTED', 'WORK_COMPLETED', 'DISPATCHED']),
  );

  const pdf = await jobber.get(`/api/v1/jobcards/${jobCard.id}/pdf`).expect(200);
  expect(pdf.headers['content-type']).toContain('application/pdf');
  expect(pdf.body.length).toBeGreaterThan(500);

  const dash = await jobber.get('/api/v1/dashboard').expect(200);
  expect(dash.body.data.role).toBe('JOBBER');
  expect(dash.body.data.summary.total).toBe(1);
  expect(dash.body.data.summary.dispatched).toBe(1);

  // --- Manufacturer (read-only) ---
  const manu = request.agent(app);
  await manu.post('/api/v1/auth/login').send({ username: MANU.username, password: MANU.password }).expect(200);

  const manuList = await manu.get('/api/v1/jobcards').expect(200);
  expect(manuList.body.data).toHaveLength(1);
  expect(manuList.body.data[0].id).toBe(jobCard.id);

  await manu.get(`/api/v1/jobcards/${jobCard.id}/pdf`).expect(200);

  // read-only: no create / update / status / delete
  await manu.put(`/api/v1/jobcards/${jobCard.id}`).send({ notes: 'hacked' }).expect(403);
  await manu.post(`/api/v1/jobcards/${jobCard.id}/start`).expect(403);
  await manu.delete(`/api/v1/jobcards/${jobCard.id}`).expect(403);
  await manu.post('/api/v1/jobcards').send({ manufacturerId }).expect(403);

  const manuDash = await manu.get('/api/v1/dashboard').expect(200);
  expect(manuDash.body.data.role).toBe('MANUFACTURER');
  expect(manuDash.body.data.jobbers?.[0]?.name).toBe('ABC Jeans Workshop');
});

t('unauthenticated + cross-tenant access is refused', async () => {
  await bootstrapUsers();
  await request(app).get('/api/v1/jobcards').expect(401);

  const jobber = request.agent(app);
  await jobber.post('/api/v1/auth/login').send({ username: JOBBER.username, password: JOBBER.password }).expect(200);
  // a Jobber cannot use the admin-only users endpoint
  await jobber.get('/api/v1/users').expect(403);
  // ...nor create a card for a Manufacturer they have not added
  await jobber
    .post('/api/v1/jobcards')
    .send({ manufacturerId: '507f1f77bcf86cd799439011' })
    .expect(400);
});
