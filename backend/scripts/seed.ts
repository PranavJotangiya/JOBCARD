/* eslint-disable no-console */
/**
 * Idempotent development seed.  Usage:  npm run seed
 *
 * Creates (if missing):
 *   - an ADMIN user
 *   - a MANUFACTURER user  ("Yash Garment")
 *   - a JOBBER user        ("ABC Jeans Workshop")
 *   - the Manufacturer <-> Jobber link (both directions)
 *   - two sample Job Cards for that pair
 *
 * Credentials are printed once. Change them immediately outside local dev.
 */
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User } from '../src/modules/users/user.model';
import { Manufacturer } from '../src/modules/manufacturers/manufacturer.model';
import { Jobber } from '../src/modules/jobbers/jobber.model';
import { JobCard } from '../src/modules/jobcards/jobcard.model';
import { Role } from '../src/constants/roles';
import { WorkStatus } from '../src/modules/jobcards/jobcard.constants';
import { hashPassword } from '../src/utils/password';

const CREDS = {
  admin: { name: 'System Administrator', username: 'admin', password: 'Admin@12345' },
  manufacturer: { name: 'Yash Garment Owner', username: 'yash', password: 'Yash@12345', company: 'Yash Garment' },
  jobber: { name: 'ABC Workshop Owner', username: 'abc', password: 'Abc@12345', workshop: 'ABC Jeans Workshop' },
};

const nameKey = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

async function ensureUser(
  cfg: { name: string; username: string; password: string },
  role: (typeof Role)[keyof typeof Role],
  extra: Record<string, unknown> = {},
): Promise<InstanceType<typeof User>> {
  const existing = await User.findOne({ username: cfg.username });
  if (existing) {
    console.log(`  • user "${cfg.username}" (${role}) already exists`);
    return existing;
  }
  const user = await User.create({
    name: cfg.name,
    username: cfg.username,
    passwordHash: await hashPassword(cfg.password),
    role,
    ...extra,
  });
  console.log(`  ✓ created ${role} "${cfg.username}"  (password: ${cfg.password})`);
  return user;
}

async function seed(): Promise<void> {
  await connectDatabase();
  console.log('Seeding JOBCARD…');

  await ensureUser(CREDS.admin, Role.ADMIN);

  // Manufacturer master + linked user
  const manufacturer =
    (await Manufacturer.findOne({ nameKey: nameKey(CREDS.manufacturer.company) })) ??
    (await Manufacturer.create({
      name: CREDS.manufacturer.company,
      nameKey: nameKey(CREDS.manufacturer.company),
    }));

  // Jobber master + linked user
  const jobber =
    (await Jobber.findOne({ nameKey: nameKey(CREDS.jobber.workshop) })) ??
    (await Jobber.create({
      name: CREDS.jobber.workshop,
      nameKey: nameKey(CREDS.jobber.workshop),
    }));

  await ensureUser(CREDS.manufacturer, Role.MANUFACTURER, { manufacturerId: manufacturer._id });
  await ensureUser(CREDS.jobber, Role.JOBBER, { jobberId: jobber._id });

  // Link both directions (idempotent)
  await Manufacturer.updateOne(
    { _id: manufacturer._id },
    { $addToSet: { linkedJobberIds: jobber._id } },
  );
  await Jobber.updateOne(
    { _id: jobber._id },
    { $addToSet: { linkedManufacturerIds: manufacturer._id } },
  );
  console.log(`  ✓ linked ${manufacturer.name} <-> ${jobber.name}`);

  const jobberUser = await User.findOne({ username: CREDS.jobber.username });

  const existingCards = await JobCard.countDocuments({
    manufacturerId: manufacturer._id,
    jobberId: jobber._id,
  });
  if (existingCards === 0) {
    await JobCard.create([
      {
        manufacturerId: manufacturer._id,
        jobberId: jobber._id,
        shortNumber: 'S-101',
        shortName: 'Blue Denim',
        fabric: { fabricType: 'Denim', color: 'Indigo', pana: 58, mtr: 1200, average: 1.2 },
        sizes: [
          { size: '30', quantity: 400 },
          { size: '32', quantity: 700 },
          { size: '34', quantity: 900 },
          { size: '36', quantity: 500 },
        ],
        bales: [
          { label: 'Bale 01', meters: 620 },
          { label: 'Bale 02', meters: 580 },
        ],
        cutting: { pattern: '5-pocket', markerLength: 7.4, markerWidth: 58, layers: 60, plies: 1 },
        notes: '2 set cutting required',
        workStatus: WorkStatus.IN_PROGRESS,
        createdBy: jobberUser?._id ?? null,
        updatedBy: jobberUser?._id ?? null,
      },
      {
        manufacturerId: manufacturer._id,
        jobberId: jobber._id,
        shortNumber: 'S-102',
        shortName: 'Black Slim',
        fabric: { fabricType: 'Denim', color: 'Black', pana: 56, mtr: 800 },
        sizes: [
          { size: '30', quantity: 300 },
          { size: '32', quantity: 500 },
          { size: '34', quantity: 500 },
        ],
        bales: [{ label: 'Bale 01', meters: 810 }],
        cutting: { pattern: 'slim', layers: 45, plies: 1 },
        workStatus: WorkStatus.DRAFT,
        createdBy: jobberUser?._id ?? null,
        updatedBy: jobberUser?._id ?? null,
      },
    ]);
    console.log('  ✓ created 2 sample job cards');
  } else {
    console.log(`  • ${existingCards} job card(s) already present for this pair`);
  }

  await disconnectDatabase();
  console.log('\nSeed complete.\n');
  console.log('Login at http://localhost:4200 with:');
  console.log(`  ADMIN         ${CREDS.admin.username} / ${CREDS.admin.password}`);
  console.log(`  MANUFACTURER  ${CREDS.manufacturer.username} / ${CREDS.manufacturer.password}`);
  console.log(`  JOBBER        ${CREDS.jobber.username} / ${CREDS.jobber.password}\n`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  void disconnectDatabase().finally(() => process.exit(1));
});
