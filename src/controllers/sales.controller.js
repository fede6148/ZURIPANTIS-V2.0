// src/controllers/sales.controller.js
// Controladores para ventas.

import XLSX from 'xlsx';
import {
  createSaleService,
  getSalesService,
  getSaleService,
  cancelSaleService,
  marcarEntregadaService,
  reactivarVentaService,
  finalizarCancelacionService,
  exportVentasService
} from '../services/sales.service.js';

const manejarErrorTransicion = (error, res, mensajeGenerico) => {
  if (error.message === 'PRODUCTO_NO_ENCONTRADO') {
    return res.status(404).json({ error: `Un producto de la venta no existe. ${error.detalle || ''}`.trim() });
  }
  if (error.message === 'STOCK_INSUFICIENTE') {
    return res.status(409).json({ error: `No hay stock suficiente. ${error.detalle || ''}`.trim() });
  }
  if (error.message === 'TRANSICION_INVALIDA') {
    return res.status(409).json({ error: error.detalle });
  }
  if (error.message === 'SIN_PRODUCTOS_VALIDOS') {
    return res.status(409).json({ error: error.detalle });
  }
  console.error(mensajeGenerico, error);
  return res.status(500).json({ error: mensajeGenerico });
};

// Controlador para registrar una nueva venta (uno o más productos)
export const createSale = async (req, res) => {
  try {
    const { items, buyerName, deliveryAddress, notes, buyerPhone, paymentMethod } = req.body;

    const sale = await createSaleService(items, { buyerName, deliveryAddress, notes, buyerPhone, paymentMethod });

    res.status(201).json(sale);

  } catch (error) {
    manejarErrorTransicion(error, res, 'Error registrando la venta');
  }
};

// Controlador para listar todas las ventas
export const getSales = async (req, res) => {
  try {
    const sales = await getSalesService();
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo ventas' });
  }
};

// Controlador para obtener una venta por id
export const getSaleById = async (req, res) => {
  try {
    const sale = await getSaleService(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo la venta' });
  }
};

// Controlador para anular una venta
export const cancelSale = async (req, res) => {
  try {
    const sale = await cancelSaleService(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    manejarErrorTransicion(error, res, 'Error anulando la venta');
  }
};

// Controlador para marcar una venta como entregada
export const marcarEntregada = async (req, res) => {
  try {
    const sale = await marcarEntregadaService(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    manejarErrorTransicion(error, res, 'Error marcando la venta como entregada');
  }
};

// Controlador para reactivar una venta anulada
export const reactivarVenta = async (req, res) => {
  try {
    const sale = await reactivarVentaService(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    manejarErrorTransicion(error, res, 'Error reactivando la venta');
  }
};

// Controlador para "Eliminar compra" (cierre definitivo de una anulada)
export const finalizarCancelacion = async (req, res) => {
  try {
    const sale = await finalizarCancelacionService(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    manejarErrorTransicion(error, res, 'Error eliminando la compra');
  }
};

// Controlador para exportar el historial de ventas a un archivo Excel
export const exportarVentas = async (req, res) => {
  try {
    const filas = await exportVentasService();

    const encabezados = [
      'ID', 'Fecha', 'Comprador', 'Teléfono', 'Dirección', 'Método de pago',
      'Observaciones', 'Estado', 'Total', 'Productos'
    ];

    const datos = filas.map((f) => [
      f.id, f.fecha, f.comprador, f.telefono, f.direccion, f.metodoPago,
      f.observaciones, f.estado, f.total, f.productos
    ]);

    const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...datos]);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Historial de ventas');

    const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="historial-ventas.xlsx"');
    res.send(buffer);

  } catch (error) {
    console.error('Error exportando ventas:', error);
    res.status(500).json({ error: 'Error exportando el historial' });
  }
};
