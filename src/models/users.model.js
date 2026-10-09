// src/models/users.model.js
// Acceso a la tabla "users" en SQLite.
// Contiene funciones para CRUD de usuarios.
//
// Migrado desde Firestore: mismas funciones exportadas, mismos nombres
// y firmas, para que services/controllers/routes no cambien.

import db from '../config/database.js';

// GET todos los usuarios
export const getAllUsersModel = async () => {
  const stmt = db.prepare('SELECT * FROM users');
  return stmt.all();
};

// GET un usuario por ID
export const getUserByIdModel = async (id) => {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = stmt.get(id);

  return user || null;
};

// GET un usuario por email (para chequear duplicados y para el login)
export const getUserByEmailModel = async (email) => {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const user = stmt.get(email);

  return user || null;
};

// POST crear usuario
export const createUserModel = async (userData) => {
  const { name, email, password, role = 'user' } = userData;

  const stmt = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(name, email, password, role);

  return result.lastInsertRowid;
};

// PUT actualizar usuario
export const updateUserModel = async (id, userData) => {
  const existing = await getUserByIdModel(id);

  if (!existing) {
    return null;
  }

  const {
    name = existing.name,
    email = existing.email,
    password = existing.password,
    role = existing.role
  } = userData;

  const stmt = db.prepare(
    'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?'
  );
  stmt.run(name, email, password, role, id);

  return {
    id: Number(id),
    name,
    email,
    password,
    role
  };
};

// DELETE eliminar usuario
export const deleteUserModel = async (id) => {
  const existing = await getUserByIdModel(id);

  if (!existing) {
    return null;
  }

  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  stmt.run(id);

  return existing;
};
