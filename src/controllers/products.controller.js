// controllers/products.controllers.js
// Controladores para productos
// Este controlador se comunica con el servicio para obtener los datos  
// y enviar la respuesta al cliente.

import {
  getProductsService,
  getProductService,
  createProductService,
  updateProductService,
  deleteProductService
} from '../services/products.service.js';

// Controlador para obtener todos los productos
export const getProducts = async (req, res) => {
  try {
    const products = await getProductsService();

    res.json(products);

  } catch (error) {
    res.status(500).json({
      error: 'Error obteniendo productos'
    });
  }
};

// Controlador para obtener un producto por ID
export const getProductById = async (req, res) => {
  try {
    const product = await getProductService(req.params.id);

    if (!product) {
      return res.status(404).json({
        error: 'Producto no encontrado'
      });
    }

    res.json(product);

  } catch (error) {
    res.status(500).json({
      error: 'Error obteniendo producto'
    });
  }
};

// Controlador para crear un nuevo producto
export const createProduct = async (req, res) => {
  try {
    const product = req.body;

    const id = await createProductService(product);

    res.status(201).json({
      id,
      ...product
    });

  } catch (error) {
    res.status(500).json({
      error: 'Error creando producto'
    });
  }
};

// Controlador para actualizar un producto existente
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = req.body;

    const updatedProduct = await updateProductService(id, product);

    if (!updatedProduct) {
      return res.status(404).json({
        error: 'Producto no encontrado'
      });
    }

    res.json(updatedProduct);

  } catch (error) {
    res.status(500).json({
      error: 'Error actualizando producto'
    });
  }
};

// Controlador para eliminar un producto por ID
export const deleteProduct = async (req, res) => {
  try {
    const deleted = await deleteProductService(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Producto no encontrado'
      });
    }

    res.json({
      message: 'Producto eliminado'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Error eliminando producto'
    });
  }
};
