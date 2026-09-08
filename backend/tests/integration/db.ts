import mongoose from 'mongoose';

/**
 * Spins up an in-memory MongoDB for integration tests. If the binary cannot be
 * provisioned (offline CI, blocked postinstall), `start()` throws and the caller
 * degrades gracefully — the suite still runs wherever a MongoDB is reachable.
 */
let memoryServer: { stop(): Promise<boolean>; getUri(): string } | null = null;

export async function startMemoryDb(): Promise<void> {
  // Lazy import so environments without the dev dependency don't crash on load.
  const { MongoMemoryServer } = (await import('mongodb-memory-server')) as {
    MongoMemoryServer: { create(opts?: unknown): Promise<{ stop(): Promise<boolean>; getUri(): string }> };
  };
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri(), { dbName: 'jobcard_it' });
}

export async function stopMemoryDb(): Promise<void> {
  await mongoose.connection.dropDatabase().catch(() => undefined);
  await mongoose.disconnect().catch(() => undefined);
  await memoryServer?.stop().catch(() => undefined);
  memoryServer = null;
}

export async function clearCollections(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}
