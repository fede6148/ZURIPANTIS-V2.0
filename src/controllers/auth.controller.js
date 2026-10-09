// controllers/auth.controllers.js
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt.js';
import { getUserByEmailModel, getUserByIdModel } from '../models/users.model.js';
import { updateUserService } from '../services/users.service.js';

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan credenciales' });
  }

  const user = await getUserByEmailModel(email);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const passwordValida = await bcrypt.compare(password, user.password);
  if (!passwordValida) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = generateToken(user);
  return res.json({
    message: 'El login fue exitoso',
    token,
    usuario: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 4 caracteres' });
  }

  const user = await getUserByIdModel(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const passwordValida = await bcrypt.compare(currentPassword, user.password);
  if (!passwordValida) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta' });
  }

  await updateUserService(user.id, { password: newPassword });

  return res.json({ message: 'Contraseña actualizada correctamente' });
};
