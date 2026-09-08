import request from 'supertest';
import { app } from '../../src/app';

/**
 * Route-level protection — holds with MongoDB disconnected because
 * authentication runs before any DB access.
 */
describe('API route guards & contract', () => {
  it('GET / returns the service descriptor in the success envelope', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { name: 'JOBCARD API' } });
  });

  it('GET /api/v1/health performs a real DB check (503 when unreachable)', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('database.pingOk');
    if (res.status === 503) {
      expect(res.body.status).toBe('degraded');
      expect(res.body.database.connected).toBe(false);
    }
  });

  it.each([
    ['GET', '/api/v1/jobcards'],
    ['POST', '/api/v1/jobcards'],
    ['GET', '/api/v1/manufacturers'],
    ['GET', '/api/v1/jobbers'],
    ['GET', '/api/v1/dashboard'],
    ['GET', '/api/v1/users'],
  ])('%s %s requires authentication', async (method, path) => {
    const res = await request(app)[method.toLowerCase() as 'get'](path);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: 'AUTH_REQUIRED' });
  });

  it('a malformed bearer token is rejected 401', async () => {
    const res = await request(app)
      .get('/api/v1/jobcards')
      .set('Authorization', 'Bearer nonsense');
    expect(res.status).toBe(401);
    expect(['AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED']).toContain(res.body.code);
  });

  it('unknown routes use the standard error contract with `code`', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, code: 'ROUTE_NOT_FOUND' });
  });

  it('GET /api/v1/auth/setup-status is public', async () => {
    const res = await request(app).get('/api/v1/auth/setup-status');
    // 200 with the flag, or 503 if it needs the DB and it is down
    expect([200, 500, 503]).toContain(res.status);
  });
});
