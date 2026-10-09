// services/products.service.js
// Lógica de negocio para productos
// Este servicio se comunica con el modelo para obtener los datos
// y realizar las operaciones necesarias antes de enviarlos al controlador.

import {
  getAllProductsModel,
  getProductByIdModel,
  createProductModel,
  updateProductModel,
  deleteProductModel
} from '../models/products.model.js';

// Obtener todos los productos
export const getProductsService = async () => {
  return await getAllProductsModel();
};

// Obtener un producto por ID
export const getProductService = async (id) => {
  return await getProductByIdModel(id);
};

// Crear un nuevo producto
export const createProductService = async (product) => {
  return await createProductModel(product);
};

// Actualizar un producto existente
export const updateProductService = async (id, product) => {
  return await updateProductModel(id, product);
};

export const deleteProductService = async (id) => {
  return await deleteProductModel(id);
};
