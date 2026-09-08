/**
 * Runs before any module (including config/environment) is imported.
 * Provides the minimum env the config validator needs so tests run without a
 * real .env. Integration tests bring their own MongoDB connection.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '4999';
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/jobcard_test';
process.env.AUTH_SECRET = 'test-auth-secret-value-at-least-32-characters-long';
process.env.LOG_LEVEL = 'silent';
process.env.CLIENT_URL = 'http://localhost:4200';
process.env.COOKIE_SECURE = 'false';
