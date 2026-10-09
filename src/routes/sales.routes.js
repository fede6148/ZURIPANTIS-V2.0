// src/routes/sales.routes.js
// Rutas para ventas.
//
// Nota: sin verifyToken porque no hay pantalla de login (ver notas
// de versiones anteriores de este archivo).

import { Router } from 'express';
import {
  createSale,
  getSales,
  getSaleById,
  cancelSale,
  marcarEntregada,
  reactivarVenta,
  finalizarCancelacion,
  exportarVentas
} from '../controllers/sales.controller.js';
import { validateSale } from '../middlewares/sale.middleware.js';

const router = Router();

router.get('/', getSales);
router.get('/export/excel', exportarVentas);
router.get('/:id', getSaleById);
router.post('/', validateSale, createSale);

router.post('/:id/cancel', cancelSale);
router.post('/:id/entregar', marcarEntregada);
router.post('/:id/reactivar', reactivarVenta);
router.post('/:id/eliminar-compra', finalizarCancelacion);

export default router;
