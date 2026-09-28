const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const authRoutes = require('./routes/auth.routes');
const donantesRoutes = require('./routes/donantes.routes');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/openapi.json', (req, res) => res.sendFile(path.join(__dirname, '..', 'openapi.json')));
app.use('/api/auth', authRoutes);
app.use('/api/donantes', donantesRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado' });
  }
  const status = err.status || 500;
  const mensaje = status === 500 ? 'Error interno del servidor' : err.message;
  return res.status(status).json({ error: mensaje });
});

module.exports = app;
