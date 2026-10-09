// src/services/users.service.js
// Lógica de negocio para usuarios.
// Es el intermediario entre el controlador y el modelo.

// Importamos bcrypt para hashear passwords
import bcrypt from 'bcryptjs';
import {
  getAllUsersModel,
  getUserByIdModel,
  getUserByEmailModel,
  createUserModel,
  updateUserModel,
  deleteUserModel
} from '../models/users.model.js';

// GET todos los usuarios (sin password)
export const getUsersService = async () => {
  const users = await getAllUsersModel();
  return users.map(({ password, ...rest }) => rest);
};

// GET un usuario por ID (sin password)
export const getUserService = async (id) => {
  const user = await getUserByIdModel(id);
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
};

// POST crear usuario (hasheando password y chequeando duplicados)
export const createUserService = async (userData) => {
  const existing = await getUserByEmailModel(userData.email);
  if (existing) throw new Error('EMAIL_DUPLICADO');

  const hashedPassword = await bcrypt.hash(userData.password, 10);
  return createUserModel({ ...userData, password: hashedPassword });
};

// PUT actualizar usuario (sin password)
export const updateUserService = async (id, userData) => {
  // Si mandan nueva password, la hasheamos antes de guardar
  if (userData.password) {
    userData.password = await bcrypt.hash(userData.password, 10);
  }
  return updateUserModel(id, userData);
};

// DELETE eliminar usuario
export const deleteUserService = async (id) => {
  return deleteUserModel(id);
};