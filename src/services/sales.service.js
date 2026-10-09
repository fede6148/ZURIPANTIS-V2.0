// src/services/sales.service.js
// Lógica de negocio para ventas. Intermediario entre controller y modelo.

import {
  createSaleModel,
  getAllSalesModel,
  getSaleByIdModel,
  cancelSaleModel,
  marcarEntregadaModel,
  reactivarVentaModel,
  finalizarCancelacionModel,
  obtenerVentasParaExportar
} from '../models/sales.model.js';

export const createSaleService = async (items, datosVenta) => {
  return await createSaleModel(items, datosVenta);
};

export const getSalesService = async () => {
  return await getAllSalesModel();
};

export const getSaleService = async (id) => {
  return await getSaleByIdModel(id);
};

export const cancelSaleService = async (id) => {
  return await cancelSaleModel(id);
};

export const marcarEntregadaService = async (id) => {
  return await marcarEntregadaModel(id);
};

export const reactivarVentaService = async (id) => {
  return await reactivarVentaModel(id);
};

export const finalizarCancelacionService = async (id) => {
  return await finalizarCancelacionModel(id);
};

export const exportVentasService = async () => {
  return await obtenerVentasParaExportar();
};
