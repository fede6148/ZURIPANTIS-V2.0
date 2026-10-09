// models/products.model.js
// Lógica de acceso a datos para productos
// Este modelo se comunica con la base de datos local (SQLite)
// para obtener los datos y realizar las operaciones necesarias.

import db, { transaction } from '../config/database.js';

// función GET para obtener todos los productos
export const getAllProductsModel = async () => {
  const stmt = db.prepare('SELECT * FROM products');
  return stmt.all();
};

// función GET para obtener un producto por ID
export const getProductByIdModel = async (id) => {
  const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
  const product = stmt.get(id);

  return product || null;
};

// función POST para crear un nuevo producto
export const createProductModel = async (product) => {
  const { name, description, price, stock, category, size, color, brand } = product;

  const stmt = db.prepare(
    `INSERT INTO products (name, description, price, stock, category, size, color, brand)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    name,
    description ?? null,
    price,
    stock,
    category ?? null,
    size ?? null,
    color ?? null,
    brand ?? null
  );

  return result.lastInsertRowid;
};

// función PUT para actualizar un producto existente
export const updateProductModel = async (id, product) => {
  const existing = await getProductByIdModel(id);

  if (!existing) {
    return null;
  }

  const {
    name = existing.name,
    description = existing.description,
    price = existing.price,
    stock = existing.stock,
    category = existing.category,
    size = existing.size,
    color = existing.color,
    brand = existing.brand
  } = product;

  const stmt = db.prepare(
    `UPDATE products
     SET name = ?, description = ?, price = ?, stock = ?, category = ?, size = ?, color = ?, brand = ?
     WHERE id = ?`
  );
  stmt.run(name, description, price, stock, category, size, color, brand, id);

  return {
    id: Number(id),
    name,
    description,
    price,
    stock,
    category,
    size,
    color,
    brand
  };
};

// función DELETE para eliminar un producto por ID.
// Ya no depende de si el producto tuvo ventas: cada ítem de venta
// guarda su propia foto (nombre/talle/color), así que antes de borrar
// el producto se desvincula esa referencia (product_id pasa a NULL en
// esos ítems) sin perder los datos congelados que ya tenían.
export const deleteProductModel = async (id) => {
  const existing = await getProductByIdModel(id);

  if (!existing) {
    return null;
  }

  transaction(() => {
    db.prepare('UPDATE sale_items SET product_id = NULL WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
  });

  return existing;
};
