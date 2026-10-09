// importar.js
// Importa/actualiza productos desde un Excel, detectando sola la hoja
// que tenga columnas NAME y PRICE.
//
// Uso:
//   node importar.js                    -> busca "productos.xlsx" en la raíz
//   node importar.js otro-archivo.xlsx  -> usa ese archivo en su lugar
//
// Si un producto ya existe (mismo NAME + SIZE + COLOR) se actualiza su
// precio, stock, categoría, marca y descripción. Si no existe, se crea.

import { importarProductosDesdeExcel } from './src/services/excel-import.service.js';

const archivo = process.argv[2] || 'productos.xlsx';

console.log(`Leyendo "${archivo}"...`);

try {
  const { creados, actualizados, saltados } = importarProductosDesdeExcel(archivo);

  console.log(`Productos creados: ${creados}`);
  console.log(`Productos actualizados: ${actualizados}`);

  if (saltados.length > 0) {
    console.log(`Se saltearon ${saltados.length} fila(s) por datos incompletos:`);
    for (const s of saltados) {
      console.log(`  - Fila ${s.fila}: ${s.motivo}`);
    }
  }

} catch (error) {
  console.error(error.detalle || error.message);
  process.exit(1);
}
