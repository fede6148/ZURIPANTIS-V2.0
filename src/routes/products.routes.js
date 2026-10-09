// routes/products.routes.js
// Rutas para productos
// Este archivo define las rutas para los productos y se comunica con el controlador.
//
// Nota: se saco verifyToken de las rutas de escritura porque, sin pantalla
// de login, no hay forma de generar el token para usarlas. Si en el futuro
// reactivan el login, alcanza con volver a poner verifyToken (import ya
// disponible en auth.middleware.js) delante de los handlers que corresponda.

import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/products.controller.js';
import { validateProduct } from '../middlewares/product.middleware.js';

// Crear el router
const router = Router();

// Definir las rutas para productos
router.get('/', getProducts);

router.get('/:id', getProductById);

router.post('/', validateProduct, createProduct);

router.put('/:id', validateProduct, updateProduct);

router.delete('/:id', deleteProduct);

export default router;
