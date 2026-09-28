const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');

async function loginAdmin() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: config.adminEmail, password: config.adminPassword });
  return res.body.token;
}

async function crearUsuario(email = 'user@test.com', password = 'Password1') {
  await request(app).post('/api/auth/registro').send({ email, password });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

const donanteValido = {
  nombre: 'Ana López',
  email: 'ana@correo.com',
  telefono: '+52 55 1234 5678',
  tipo_donacion: 'monetaria',
  monto: 500,
};

module.exports = { app, request, loginAdmin, crearUsuario, donanteValido };
