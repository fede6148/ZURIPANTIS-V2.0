// middlewares/auth.middleware.js
// Este middleware se utiliza para proteger las rutas que requieren autenticación.

import jwt from 'jsonwebtoken';

// verificar token JWT
export const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization'];

  if (!bearerHeader) {
    return res.status(401).json({
      error: 'Token requerido'
    });
  }

  const token = bearerHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();

  } catch (error) {
    return res.status(403).json({
      error: 'Token inválido o expirado'
    });
  }
};