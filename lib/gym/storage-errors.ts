export class GymStorageError extends Error {
  constructor(public readonly code: 'DATABASE_NOT_CONFIGURED' | 'DATABASE_NOT_INITIALIZED') {
    super(code === 'DATABASE_NOT_CONFIGURED'
      ? 'Database connection settings are missing. Ask your administrator to configure the Upstash environment variables.'
      : 'The gym database is connected, but its initial admin account has not been created. Ask your administrator to complete database setup.');
    this.name = 'GymStorageError';
  }
}
