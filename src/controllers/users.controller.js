// src/controllers/users.controller.js
// Recibe req/res, llama al servicio y devuelve la respuesta HTTP.
// Contiene la lógica de control de usuarios.

import {
  getUsersService,
  getUserService,
  createUserService,
  updateUserService,
  deleteUserService
} from '../services/users.service.js';

// GET /api/users
export const getUsers = async (req, res) => {
  try {
    const users = await getUsersService();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
};

// GET /api/users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await getUserService(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo usuario' });
  }
};

// POST /api/users
export const createUser = async (req, res) => {
  try {
    const user = req.body;
    const id = await createUserService(user);

    res.status(201).json({ id, ...user });
  } catch (error) {
    // Email duplicado
    if (error.message === 'EMAIL_DUPLICADO') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: 'Error creando usuario' });
  }
};

// PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await updateUserService(id, req.body);

    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    const deleted = await deleteUserService(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
};
