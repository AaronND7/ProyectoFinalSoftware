const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const config = require('../config');

class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function registrar({ email, password }) {
  const db = getDb();
  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existe) throw new AuthError('El email ya está registrado', 409);

  const hash = bcrypt.hashSync(password, 10);
  // Todo registro público recibe rol "usuario"; solo un admin puede promover
  const info = db.prepare('INSERT INTO usuarios (email, password_hash, rol) VALUES (?, ?, ?)')
    .run(email, hash, 'usuario');
  return { id: Number(info.lastInsertRowid), email, rol: 'usuario' };
}

function login({ email, password }) {
  const user = getDb().prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new AuthError('Credenciales inválidas', 401);
  }
  const token = jwt.sign({ sub: user.id, email: user.email, rol: user.rol }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  return { token, usuario: { id: user.id, email: user.email, rol: user.rol } };
}

function cambiarRol(id, rol) {
  if (!['admin', 'usuario'].includes(rol)) throw new AuthError('Rol inválido', 400);
  const info = getDb().prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run(rol, id);
  if (info.changes === 0) throw new AuthError('Usuario no encontrado', 404);
  return { id: Number(id), rol };
}

module.exports = { registrar, login, cambiarRol, AuthError };
