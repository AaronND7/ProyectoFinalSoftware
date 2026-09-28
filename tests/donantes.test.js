const { resetDb } = require('../src/db');
const { app, request, loginAdmin, crearUsuario, donanteValido } = require('./helpers');

let admin;
let user;

beforeEach(async () => {
  resetDb();
  admin = await loginAdmin();
  user = await crearUsuario();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function crearDonante(token, data = donanteValido) {
  return request(app).post('/api/donantes').set(auth(token)).send(data);
}

describe('POST /api/donantes', () => {
  test('un usuario registra un donante', async () => {
    const res = await crearDonante(user);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nombre: 'Ana López', tipo_donacion: 'monetaria', monto: 500 });
  });

  test('acepta donante sin teléfono ni monto', async () => {
    const res = await crearDonante(user, { nombre: 'Luis', email: 'luis@correo.com', tipo_donacion: 'sangre' });
    expect(res.status).toBe(201);
    expect(res.body.telefono).toBeNull();
    expect(res.body.monto).toBeNull();
  });

  test('valida los campos obligatorios', async () => {
    const res = await crearDonante(user, {});
    expect(res.status).toBe(400);
    expect(res.body.errores.length).toBeGreaterThanOrEqual(3);
  });

  test('valida teléfono, tipo y monto', async () => {
    const res = await crearDonante(user, {
      ...donanteValido, telefono: 'abc', tipo_donacion: 'otro', monto: -5,
    });
    expect(res.status).toBe(400);
    expect(res.body.errores).toHaveLength(3);
  });

  test('rechaza email duplicado', async () => {
    await crearDonante(user);
    const res = await crearDonante(user);
    expect(res.status).toBe(409);
  });

  test('neutraliza payloads XSS en el nombre', async () => {
    const res = await crearDonante(user, { ...donanteValido, nombre: '<script>alert(1)</script>Eva' });
    expect(res.status).toBe(201);
    expect(res.body.nombre).not.toMatch(/[<>]/);
  });

  test('responde 400 ante JSON mal formado', async () => {
    const res = await request(app)
      .post('/api/donantes')
      .set(auth(user))
      .set('Content-Type', 'application/json')
      .send('{"nombre": ');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/donantes', () => {
  test('un usuario solo ve los donantes que registró', async () => {
    const otro = await crearUsuario('otro@test.com');
    await crearDonante(user);
    await crearDonante(otro, { ...donanteValido, email: 'b@correo.com' });

    const res = await request(app).get('/api/donantes').set(auth(user));
    expect(res.body).toHaveLength(1);
  });

  test('un admin ve todos los donantes', async () => {
    await crearDonante(user);
    await crearDonante(admin, { ...donanteValido, email: 'b@correo.com' });
    const res = await request(app).get('/api/donantes').set(auth(admin));
    expect(res.body).toHaveLength(2);
  });

  test('filtra por nombre', async () => {
    await crearDonante(admin);
    await crearDonante(admin, { ...donanteValido, nombre: 'Pedro', email: 'p@correo.com' });
    const res = await request(app).get('/api/donantes?buscar=Ped').set(auth(admin));
    expect(res.body.map((d) => d.nombre)).toEqual(['Pedro']);
  });

  test('un intento de SQLi en la búsqueda no filtra datos', async () => {
    await crearDonante(admin);
    const res = await request(app)
      .get(`/api/donantes?buscar=${encodeURIComponent("' OR 1=1 --")}`)
      .set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('GET /api/donantes/:id', () => {
  test('el dueño puede consultar su donante', async () => {
    const { body } = await crearDonante(user);
    const res = await request(app).get(`/api/donantes/${body.id}`).set(auth(user));
    expect(res.status).toBe(200);
  });

  test('otro usuario no puede consultarlo', async () => {
    const { body } = await crearDonante(admin);
    const res = await request(app).get(`/api/donantes/${body.id}`).set(auth(user));
    expect(res.status).toBe(403);
  });

  test('devuelve 404 si no existe', async () => {
    const res = await request(app).get('/api/donantes/999').set(auth(admin));
    expect(res.status).toBe(404);
  });

  test('devuelve 400 si el id no es numérico', async () => {
    const res = await request(app).get('/api/donantes/abc').set(auth(admin));
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/donantes/:id', () => {
  test('un admin actualiza un donante', async () => {
    const { body } = await crearDonante(user);
    const res = await request(app).put(`/api/donantes/${body.id}`).set(auth(admin)).send({ monto: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.monto).toBe(1000);
  });

  test('sin campos devuelve el registro sin cambios', async () => {
    const { body } = await crearDonante(user);
    const res = await request(app).put(`/api/donantes/${body.id}`).set(auth(admin)).send({ campo_raro: 1 });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe(body.nombre);
  });

  test('un usuario normal no puede actualizar', async () => {
    const { body } = await crearDonante(user);
    const res = await request(app).put(`/api/donantes/${body.id}`).set(auth(user)).send({ monto: 1 });
    expect(res.status).toBe(403);
  });

  test('valida los datos', async () => {
    const { body } = await crearDonante(user);
    const res = await request(app).put(`/api/donantes/${body.id}`).set(auth(admin)).send({ email: 'x' });
    expect(res.status).toBe(400);
  });

  test('rechaza email duplicado', async () => {
    await crearDonante(user);
    const { body } = await crearDonante(user, { ...donanteValido, email: 'b@correo.com' });
    const res = await request(app)
      .put(`/api/donantes/${body.id}`)
      .set(auth(admin))
      .send({ email: donanteValido.email });
    expect(res.status).toBe(409);
  });

  test('devuelve 404 si no existe', async () => {
    const res = await request(app).put('/api/donantes/999').set(auth(admin)).send({ monto: 1 });
    expect(res.status).toBe(404);
  });

  test('devuelve 400 si el id es inválido', async () => {
    const res = await request(app).put('/api/donantes/-1').set(auth(admin)).send({ monto: 1 });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/donantes/:id', () => {
  test('un admin elimina un donante', async () => {
    const { body } = await crearDonante(user);
    const res = await request(app).delete(`/api/donantes/${body.id}`).set(auth(admin));
    expect(res.status).toBe(204);
  });

  test('un usuario normal no puede eliminar', async () => {
    const { body } = await crearDonante(user);
    const res = await request(app).delete(`/api/donantes/${body.id}`).set(auth(user));
    expect(res.status).toBe(403);
  });

  test('devuelve 404 si no existe', async () => {
    const res = await request(app).delete('/api/donantes/999').set(auth(admin));
    expect(res.status).toBe(404);
  });

  test('devuelve 400 si el id es inválido', async () => {
    const res = await request(app).delete('/api/donantes/1.5').set(auth(admin));
    expect(res.status).toBe(400);
  });
});

describe('rutas generales', () => {
  test('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.body.status).toBe('ok');
  });

  test('GET /openapi.json expone la especificación', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
  });

  test('ruta inexistente devuelve 404', async () => {
    const res = await request(app).get('/no-existe');
    expect(res.status).toBe(404);
  });

  test('incluye cabeceras de seguridad de helmet', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
