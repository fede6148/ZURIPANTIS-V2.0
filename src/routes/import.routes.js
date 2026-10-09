// src/routes/import.routes.js
// Ruta para importar productos desde un Excel subido desde el navegador.

import { Router } from 'express';
import multer from 'multer';
import { importarExcel } from '../controllers/import.controller.js';

// Guarda el archivo en memoria (no en disco): se procesa al vuelo.
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.post('/excel', upload.single('archivo'), importarExcel);

export default router;
