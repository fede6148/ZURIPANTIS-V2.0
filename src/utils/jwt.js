// utils/jwt.js
// Generación de tokens JWT para autenticación.
// Este archivo contiene la lógica para generar tokens JWT 
// que se utilizarán para autenticar a los usuarios en la aplicación.

import dotenv from "dotenv";
dotenv.config();

import jwt from 'jsonwebtoken';

// Generar un token JWT para un usuario
export const generateToken = (userData) => {
  const payload = {
    id: userData.id,
  };
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: '1h'// El token expira en 1 hora
    }
  );
};
   