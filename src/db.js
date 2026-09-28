const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const config = require('./config');

let db;

function createSchema(conn) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('admin', 'usuario')),
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS donantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      telefono TEXT,
      tipo_donacion TEXT NOT NULL CHECK (tipo_donacion IN ('monetaria', 'especie', 'sangre', 'voluntariado')),
      monto REAL,
      registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedAdmin(conn) {
  const existe = conn.prepare('SELECT id FROM usuarios WHERE email = ?').get(config.adminEmail);
  if (!existe) {
    const hash = bcrypt.hashSync(config.adminPassword, 10);
    conn.prepare('INSERT INTO usuarios (email, password_hash, rol) VALUES (?, ?, ?)')
      .run(config.adminEmail, hash, 'admin');
  }
}

function getDb() {
  if (!db) {
    db = new DatabaseSync(config.dbFile);
    createSchema(db);
    seedAdmin(db);
  }
  return db;
}

function resetDb() {
  if (db) db.close();
  db = undefined;
  return getDb();
}

module.exports = { getDb, resetDb };
