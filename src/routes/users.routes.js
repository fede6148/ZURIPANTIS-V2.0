// src/routes/users.routes.js
// Rutas para usuarios
// Contiene la definición de rutas y middlewares para usuarios.

import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/users.controller.js';
import { validateUser } from '../middlewares/user.middleware.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/users → listar todos los usuarios (protegido)
router.get('/', verifyToken, getUsers);

// GET /api/users/:id → obtener usuario por ID (protegido)
router.get('/:id', verifyToken, getUserById);

// POST /api/users → crear un nuevo usuario
router.post('/', validateUser, createUser);

// PUT /api/users/:id → actualizar un usuario (protegido)
router.put('/:id', verifyToken, validateUser, updateUser);

// DELETE /api/users/:id → eliminar un usuario (protegido)
router.delete('/:id', verifyToken, deleteUser);

export default router;
