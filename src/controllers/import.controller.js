// src/controllers/import.controller.js
// Recibe el Excel subido desde el botón "Actualizar desde Excel" del
// dashboard y lo procesa con la misma lógica que usa importar.js por
// consola: busca automáticamente la hoja con columnas NAME/PRICE.

import { importarProductosDesdeExcel } from '../services/excel-import.service.js';

export const importarExcel = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  try {
    const resultado = importarProductosDesdeExcel(req.file.buffer);
    res.json(resultado);

  } catch (error) {
    if (['ARCHIVO_INVALIDO', 'ENCABEZADOS_NO_ENCONTRADOS', 'EXCEL_VACIO'].includes(error.message)) {
      return res.status(400).json({ error: error.detalle });
    }

    console.error('Error importando Excel:', error);
    res.status(500).json({ error: 'Error procesando el archivo' });
  }
};
