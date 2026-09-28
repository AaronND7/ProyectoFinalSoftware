const { getDb } = require('../db');
const { sanitizeText } = require('../utils/validators');

class NotFoundError extends Error {
  constructor(message = 'Donante no encontrado') {
    super(message);
    this.status = 404;
  }
}

class ConflictError extends Error {
  constructor(message = 'Ya existe un donante con ese email') {
    super(message);
    this.status = 409;
  }
}

const CAMPOS = ['nombre', 'email', 'telefono', 'tipo_donacion', 'monto'];

function limpiar(data) {
  const out = {};
  for (const campo of CAMPOS) {
    if (data[campo] === undefined) continue;
    out[campo] = typeof data[campo] === 'string' ? sanitizeText(data[campo]) : data[campo];
  }
  return out;
}

function esDuplicado(err) {
  return /UNIQUE constraint failed/.test(err.message);
}

// Todas las consultas usan sentencias preparadas (parámetros ?) para prevenir SQLi
function crear(data, usuarioId) {
  const d = limpiar(data);
  try {
    const info = getDb().prepare(`
      INSERT INTO donantes (nombre, email, telefono, tipo_donacion, monto, registrado_por)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(d.nombre, d.email, d.telefono ?? null, d.tipo_donacion, d.monto ?? null, usuarioId);
    return obtener(Number(info.lastInsertRowid));
  } catch (err) {
    if (esDuplicado(err)) throw new ConflictError();
    throw err;
  }
}

function listar({ usuario, buscar } = {}) {
  let sql = 'SELECT * FROM donantes WHERE 1 = 1';
  const params = [];
  if (usuario.rol !== 'admin') {
    sql += ' AND registrado_por = ?';
    params.push(usuario.sub);
  }
  if (buscar) {
    sql += ' AND nombre LIKE ?';
    params.push(`%${buscar}%`);
  }
  sql += ' ORDER BY id';
  return getDb().prepare(sql).all(...params);
}

function obtener(id) {
  const donante = getDb().prepare('SELECT * FROM donantes WHERE id = ?').get(id);
  if (!donante) throw new NotFoundError();
  return donante;
}

function actualizar(id, data) {
  obtener(id);
  const d = limpiar(data);
  // Los nombres de columna vienen de la lista blanca CAMPOS, nunca del usuario
  const campos = Object.keys(d);
  if (campos.length === 0) return obtener(id);

  const set = campos.map((c) => `${c} = ?`).join(', ');
  try {
    getDb().prepare(`UPDATE donantes SET ${set} WHERE id = ?`).run(...campos.map((c) => d[c]), id);
  } catch (err) {
    if (esDuplicado(err)) throw new ConflictError();
    throw err;
  }
  return obtener(id);
}

function eliminar(id) {
  const info = getDb().prepare('DELETE FROM donantes WHERE id = ?').run(id);
  if (info.changes === 0) throw new NotFoundError();
}

module.exports = { crear, listar, obtener, actualizar, eliminar, NotFoundError, ConflictError };
