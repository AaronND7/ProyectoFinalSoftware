const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  dbFile: process.env.DB_FILE || ':memory:',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@donantes.org',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin123!',
};

module.exports = config;
