const jwt = require('jsonwebtoken');
const { resetDb } = require('../src/db');
const config = require('../src/config');
const { app, request, loginAdmin, crearUsuario } = require('./helpers');

beforeEach(() => resetDb());

describe('POST /api/auth/registro', () => {
  test('registra un usuario con rol "usuario"', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ email: 'nuevo@test.com', password: 'Password1' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'nuevo@test.com', rol: 'usuario' });
    expect(res.body).not.toHaveProperty('password_hash');
  });

  test('ignora un intento de autoasignarse rol admin', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ email: 'hacker@test.com', password: 'Password1', rol: 'admin' });
    expect(res.body.rol).toBe('usuario');
  });

  test('rechaza datos inválidos', async () => {
    const res = await request(app).post('/api/auth/registro').send({ email: 'malo', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.errores).toHaveLength(2);
  });

  test('rechaza cuerpo vacío', async () => {
    const res = await request(app).post('/api/auth/registro');
    expect(res.status).toBe(400);
  });

  test('rechaza email duplicado', async () => {
    const body = { email: 'dup@test.com', password: 'Password1' };
    await request(app).post('/api/auth/registro').send(body);
    const res = await request(app).post('/api/auth/registro').send(body);
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  test('devuelve un JWT válido con el rol del usuario', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: config.adminEmail, password: config.adminPassword });
    expect(res.status).toBe(200);
    const payload = jwt.verify(res.body.token, config.jwtSecret);
    expect(payload.rol).toBe('admin');
  });

  test('rechaza password incorrecto', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: config.adminEmail, password: 'incorrecto' });
    expect(res.status).toBe(401);
  });

  test('rechaza usuario inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@test.com', password: 'Password1' });
    expect(res.status).toBe(401);
  });

  test('exige email y password', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  test('rechaza intento de SQLi en el email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: "' OR '1'='1", password: "' OR '1'='1" });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/usuarios/:id/rol', () => {
  test('un admin puede promover a un usuario', async () => {
    const admin = await loginAdmin();
    const reg = await request(app)
      .post('/api/auth/registro')
      .send({ email: 'promo@test.com', password: 'Password1' });
    const res = await request(app)
      .patch(`/api/auth/usuarios/${reg.body.id}/rol`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ rol: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.rol).toBe('admin');
  });

  test('rechaza rol inválido', async () => {
    const admin = await loginAdmin();
    const res = await request(app)
      .patch('/api/auth/usuarios/1/rol')
      .set('Authorization', `Bearer ${admin}`)
      .send({ rol: 'superusuario' });
    expect(res.status).toBe(400);
  });

  test('devuelve 404 si el usuario no existe', async () => {
    const admin = await loginAdmin();
    const res = await request(app)
      .patch('/api/auth/usuarios/999/rol')
      .set('Authorization', `Bearer ${admin}`)
      .send({ rol: 'admin' });
    expect(res.status).toBe(404);
  });

  test('un usuario normal no puede cambiar roles', async () => {
    const user = await crearUsuario();
    const res = await request(app)
      .patch('/api/auth/usuarios/1/rol')
      .set('Authorization', `Bearer ${user}`)
      .send({ rol: 'usuario' });
    expect(res.status).toBe(403);
  });
});

describe('middleware de autenticación', () => {
  test('rechaza peticiones sin token', async () => {
    const res = await request(app).get('/api/donantes');
    expect(res.status).toBe(401);
  });

  test('rechaza token mal firmado', async () => {
    const falso = jwt.sign({ sub: 1, rol: 'admin' }, 'otro-secreto');
    const res = await request(app).get('/api/donantes').set('Authorization', `Bearer ${falso}`);
    expect(res.status).toBe(401);
  });

  test('rechaza token expirado', async () => {
    const expirado = jwt.sign({ sub: 1, rol: 'admin' }, config.jwtSecret, { expiresIn: -10 });
    const res = await request(app).get('/api/donantes').set('Authorization', `Bearer ${expirado}`);
    expect(res.status).toBe(401);
  });

  test('rechaza esquema distinto a Bearer', async () => {
    const res = await request(app).get('/api/donantes').set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
  });

  test('rechaza token con rol no reconocido', async () => {
    const raro = jwt.sign({ sub: 1, rol: 'invitado' }, config.jwtSecret);
    const res = await request(app).get('/api/donantes').set('Authorization', `Bearer ${raro}`);
    expect(res.status).toBe(403);
  });
});
