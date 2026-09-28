const { sanitizeText, validarCredenciales, validarDonante } = require('../src/utils/validators');
const { autorizar } = require('../src/middleware/auth');
const donanteService = require('../src/services/donante.service');
const { resetDb, getDb } = require('../src/db');

describe('validators', () => {
  test('sanitizeText elimina caracteres peligrosos', () => {
    expect(sanitizeText('  <b>"Hola"</b> ')).toBe('bHola/b');
  });

  test('validarCredenciales sin argumentos', () => {
    expect(validarCredenciales()).toHaveLength(2);
  });

  test('validarDonante sin argumentos', () => {
    expect(validarDonante().length).toBeGreaterThan(0);
  });

  test('validarDonante parcial permite campos ausentes', () => {
    expect(validarDonante({ monto: 10 }, { parcial: true })).toEqual([]);
  });

  test('validarDonante acepta telefono y monto null', () => {
    expect(validarDonante({ telefono: null, monto: null }, { parcial: true })).toEqual([]);
  });

  test('validarDonante rechaza monto no numérico', () => {
    expect(validarDonante({ monto: '100' }, { parcial: true })).toHaveLength(1);
  });
});

describe('autorizar', () => {
  test('responde 403 si no hay usuario en la petición', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    autorizar('admin')({}, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('donante.service', () => {
  beforeEach(() => resetDb());

  test('propaga errores de base de datos no esperados', () => {
    getDb().exec('DROP TABLE donantes');
    expect(() => donanteService.crear({ nombre: 'X', email: 'x@x.com', tipo_donacion: 'sangre' }, 1))
      .toThrow(/no such table/);
  });

  test('actualizar propaga errores no esperados', () => {
    const d = donanteService.crear({ nombre: 'X', email: 'x@x.com', tipo_donacion: 'sangre' }, 1);
    expect(() => donanteService.actualizar(d.id, { tipo_donacion: 'invalido' })).toThrow(/CHECK/);
  });

  test('listar sin argumentos falla de forma controlada', () => {
    expect(() => donanteService.listar()).toThrow(TypeError);
  });
});

describe('manejador de errores', () => {
  test('oculta detalles de errores internos (500)', async () => {
    const request = require('supertest');
    const app = require('../src/app');
    const { loginAdmin } = require('./helpers');
    resetDb();
    const token = await loginAdmin();
    getDb().exec('DROP TABLE donantes');
    const res = await request(app).get('/api/donantes/1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
  });
});
