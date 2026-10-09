// src/services/excel-import.service.js
// Importa/actualiza productos desde un Excel.
//
// En vez de depender del nombre de la hoja, busca AUTOMÁTICAMENTE la
// hoja que tenga encabezados NAME y PRICE (sin importar mayúsculas ni
// en qué posición de fila estén) — así funciona tanto si armás una
// hoja aparte como si le agregás una fila de encabezados en inglés a
// una hoja existente (por ejemplo, arriba de tu hoja de gestión
// interna, dejando el resto de las columnas de costos sin tocar).
//
// Columnas reconocidas: NAME, BRAND, SIZE, STOCK, CATEGORY, PRICE
// (obligatorias las primeras cuatro más PRICE), y opcionalmente
// COLOR/COLOUR y DESCRIPTION.

import XLSX from 'xlsx';
import db, { transaction } from '../config/database.js';

const normalizar = (valor) => (valor || '').toString().trim().toLowerCase();

// Alias aceptados por campo (además del nombre exacto en mayúsculas).
const ALIAS = {
  NAME: ['name'],
  BRAND: ['brand'],
  SIZE: ['size'],
  STOCK: ['stock'],
  CATEGORY: ['category'],
  PRICE: ['price'],
  COLOR: ['color', 'colour'],
  DESCRIPTION: ['description']
};

const obtenerCampo = (fila, campo) => {
  const candidatos = ALIAS[campo];
  const claveReal = Object.keys(fila).find((k) => candidatos.includes(normalizar(k)));
  return claveReal ? fila[claveReal] : undefined;
};

// Si Excel guarda el talle/categoría/etc. como número (ej: talle "115"
// tipeado sin comillas), SQLite le agrega ".0" al guardarlo en una
// columna de texto tal cual. Convertirlo a string en JS antes evita eso.
const comoTexto = (valor) => {
  if (valor === undefined || valor === null || valor === '') return valor;
  return String(valor);
};

// Recorre todas las hojas del archivo y devuelve la primera fila de
// encabezados que tenga tanto NAME como PRICE (sin importar en qué
// fila del sheet estén, por si hay filas vacías o títulos arriba).
const encontrarHojaDeImportacion = (excel) => {
  for (const nombreHoja of excel.SheetNames) {
    const hoja = excel.Sheets[nombreHoja];
    const filasCrudas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: null });

    for (let i = 0; i < Math.min(filasCrudas.length, 10); i++) {
      const encabezados = (filasCrudas[i] || []).map(normalizar);
      const tieneName = encabezados.some((h) => ALIAS.NAME.includes(h));
      const tienePrice = encabezados.some((h) => ALIAS.PRICE.includes(h));

      if (tieneName && tienePrice) {
        return { nombreHoja, filaEncabezados: i };
      }
    }
  }

  return null;
};

const buscarProductoStmt = db.prepare(`
  SELECT id FROM products
  WHERE LOWER(TRIM(name)) = ?
    AND LOWER(TRIM(COALESCE(size, ''))) = ?
    AND LOWER(TRIM(COALESCE(color, ''))) = ?
`);

const insertarStmt = db.prepare(`
  INSERT INTO products (name, description, price, stock, category, size, color, brand)
  VALUES ($name, $description, $price, $stock, $category, $size, $color, $brand)
`);

const actualizarStmt = db.prepare(`
  UPDATE products
  SET price = $price, stock = $stock, category = $category, description = $description, brand = $brand
  WHERE id = $id
`);

// Junta filas que representan el mismo producto (mismo nombre+talle+color)
// DENTRO del mismo Excel, sumando su stock. Pasa en planillas reales
// donde el mismo producto aparece en más de una fila (distintas
// partidas recibidas por separado).
const consolidarCandidatos = (candidatos) => {
  const porClave = new Map();

  for (const candidato of candidatos) {
    const clave = [
      normalizar(candidato.nombre),
      normalizar(candidato.talle),
      normalizar(candidato.color)
    ].join('|');

    if (porClave.has(clave)) {
      porClave.get(clave).stock += candidato.stock;
    } else {
      porClave.set(clave, { ...candidato });
    }
  }

  return Array.from(porClave.values());
};

const procesarProducto = ({ nombre, precio, stock, categoria, talle, color, marca, descripcion }, resultado) => {
  const existente = buscarProductoStmt.get(
    normalizar(nombre),
    normalizar(talle),
    normalizar(color)
  );

  if (existente) {
    actualizarStmt.run({
      $id: existente.id,
      $price: precio,
      $stock: stock,
      $category: categoria || null,
      $description: descripcion || null,
      $brand: marca || null
    });
    resultado.actualizados++;
  } else {
    insertarStmt.run({
      $name: nombre,
      $description: descripcion || null,
      $price: precio,
      $stock: stock,
      $category: categoria || null,
      $size: talle || null,
      $color: color || null,
      $brand: marca || null
    });
    resultado.creados++;
  }
};

export const importarProductosDesdeExcel = (origen) => {
  let excel;
  try {
    excel = Buffer.isBuffer(origen)
      ? XLSX.read(origen, { type: 'buffer' })
      : XLSX.readFile(origen);
  } catch (error) {
    const err = new Error('ARCHIVO_INVALIDO');
    err.detalle = 'No se pudo leer el archivo. ¿Es un Excel válido (.xlsx)?';
    throw err;
  }

  const encontrada = encontrarHojaDeImportacion(excel);

  if (!encontrada) {
    const err = new Error('ENCABEZADOS_NO_ENCONTRADOS');
    err.detalle = `Ninguna hoja tiene columnas "NAME" y "PRICE". Hojas revisadas: ${excel.SheetNames.join(', ')}.`;
    throw err;
  }

  const { nombreHoja, filaEncabezados } = encontrada;

  // range: filaEncabezados le dice a sheet_to_json a partir de qué
  // fila están los encabezados reales (por si hay filas de título
  // arriba, o una fila extra con nombres en español debajo, que se
  // ignora sola porque no tiene NAME/PRICE en sus valores).
  const filas = XLSX.utils.sheet_to_json(excel.Sheets[nombreHoja], { range: filaEncabezados });

  if (filas.length === 0) {
    const err = new Error('EXCEL_VACIO');
    err.detalle = `La hoja "${nombreHoja}" no tiene filas con datos debajo de los encabezados.`;
    throw err;
  }

  const resultado = { creados: 0, actualizados: 0, saltados: [] };
  const candidatos = [];

  filas.forEach((fila, indice) => {
    const candidato = {
      nombre: comoTexto(obtenerCampo(fila, 'NAME')),
      marca: comoTexto(obtenerCampo(fila, 'BRAND')),
      talle: comoTexto(obtenerCampo(fila, 'SIZE')),
      stock: parseInt(obtenerCampo(fila, 'STOCK') ?? 0, 10),
      categoria: comoTexto(obtenerCampo(fila, 'CATEGORY')),
      precio: Number(obtenerCampo(fila, 'PRICE') ?? 0),
      color: comoTexto(obtenerCampo(fila, 'COLOR')),
      descripcion: comoTexto(obtenerCampo(fila, 'DESCRIPTION'))
    };

    if (!candidato.nombre || !candidato.precio || Number.isNaN(candidato.stock)) {
      resultado.saltados.push({
        fila: indice + filaEncabezados + 2,
        motivo: 'falta NAME, PRICE o STOCK válido'
      });
      return;
    }

    candidatos.push(candidato);
  });

  transaction(() => {
    consolidarCandidatos(candidatos).forEach((candidato) => procesarProducto(candidato, resultado));
  });

  return resultado;
};
