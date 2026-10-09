// app.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import productsRoutes from './src/routes/products.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import usersRoutes from './src/routes/users.routes.js';
import salesRoutes from './src/routes/sales.routes.js';
import importRoutes from './src/routes/import.routes.js';
import { verifyToken } from './src/middlewares/auth.middleware.js';

let __dirname;
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = path.dirname(process.execPath);
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/products', verifyToken, productsRoutes);
app.use('/api/users', verifyToken, usersRoutes);
app.use('/api/sales', verifyToken, salesRoutes);
app.use('/api/import', verifyToken, importRoutes);

app.get('/up', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor activo' });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

export default app;
