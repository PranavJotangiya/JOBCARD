import mongoose from 'mongoose';
import { env } from './environment';
import { logger } from '../utils/logger';

/**
 * Dedicated MongoDB (Atlas) connection layer.
 *
 * The rest of the application never calls `mongoose.connect` directly — it uses
 * `connectDatabase()` at startup and `getDatabaseState()` for health checks.
 */

mongoose.set('strictQuery', true);

// Surface connection lifecycle events in the structured log.
mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));

export interface DatabaseState {
  /** Mongoose numeric readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting. */
  readyState: number;
  status: 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown';
  /** Whether a lightweight `admin().ping()` currently succeeds. */
  pingOk: boolean;
}

const READY_STATE_LABELS: Record<number, DatabaseState['status']> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export async function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const conn = await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 20,
    minPoolSize: 2,
    retryWrites: true,
  });

  return conn;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  logger.info('MongoDB connection closed');
}

/**
 * Actively verifies connectivity (used by GET /health) rather than trusting
 * the cached readyState alone.
 */
export async function getDatabaseState(): Promise<DatabaseState> {
  const readyState = mongoose.connection.readyState;
  const status = READY_STATE_LABELS[readyState] ?? 'unknown';

  let pingOk = false;
  if (readyState === 1 && mongoose.connection.db) {
    try {
      const res = await mongoose.connection.db.admin().ping();
      pingOk = res?.ok === 1;
    } catch (err) {
      logger.warn({ err }, 'Database ping failed');
      pingOk = false;
    }
  }

  return { readyState, status, pingOk };
}

export { mongoose };
