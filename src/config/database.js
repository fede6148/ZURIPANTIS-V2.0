// src/config/database.js
// Conexión a la base de datos local SQLite.
//
// Usa el módulo "node:sqlite", incorporado en Node.js desde la
// versión 22.5 (estable/sin flag desde la 24). No es un módulo nativo
// de terceros: viene adentro del propio Node, así que "npm install"
// nunca necesita compilar nada para la base de datos (antes usábamos
// better-sqlite3, que sí requería herramientas de compilación C++ en
// algunas PCs).

import { DatabaseSync } from 'node:sqlite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

let __dirname;
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  // Empaquetado con esbuild a CJS: import.meta.url no existe y esbuild
  // lo deja en undefined. En CJS no hace falta calcularlo: ya existe
  // como variable nativa del propio modulo.
  __dirname = path.dirname(process.execPath);
}

// La ruta del archivo de base de datos se puede configurar por .env
// (DB_PATH); si no se define, se usa database.db en la raíz del proyecto.
const dbPath = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.resolve(__dirname, '../../database.db');

const db = new DatabaseSync(dbPath);

// node:sqlite no trae el helper db.transaction(fn) de better-sqlite3.
// Este reemplazo hace lo mismo: corre fn() dentro de BEGIN/COMMIT, y
// si algo tira error hace ROLLBACK antes de relanzarlo, para que nunca
// quede una operación a mitad de camino.
export const transaction = (fn) => {
  db.exec('BEGIN');
  try {
    const resultado = fn();
    db.exec('COMMIT');
    return resultado;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

// node:sqlite recomienda activar WAL para mejor rendimiento y evitar
// bloqueos cuando hay varias lecturas/escrituras seguidas.
db.exec('PRAGMA journal_mode = WAL');

const tableExists = (table) =>
  Boolean(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
  );

const columnsOf = (table) =>
  db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);

const addColumnIfMissing = (table, column, definition) => {
  if (!columnsOf(table).includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

// Las FK se desactivan durante el armado/migración de tablas y se
// reactivan al final, para poder reorganizar "sales" sin conflictos.
db.exec('PRAGMA foreign_keys = OFF');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );
`);

// Migración de productos: category/size/color (por si vienen de una
// base anterior a esos campos).
addColumnIfMissing('products', 'category', 'TEXT');
addColumnIfMissing('products', 'size', 'TEXT');
addColumnIfMissing('products', 'color', 'TEXT');
addColumnIfMissing('products', 'brand', 'TEXT');

// ---------------------------------------------------------------
// Migración de ventas: de "una venta = un producto" (esquema viejo,
// tabla sales con product_id/quantity/unit_price/total en la misma
// fila) a "una venta = varios productos" (sales + sale_items).
// ---------------------------------------------------------------

const salesEsEsquemaViejo = tableExists('sales') && columnsOf('sales').includes('product_id');

if (salesEsEsquemaViejo) {
  db.exec('ALTER TABLE sales RENAME TO sales_old');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    total REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

if (salesEsEsquemaViejo) {
  const ventasViejas = db.prepare('SELECT * FROM sales_old').all();

  const insertSale = db.prepare(
    'INSERT INTO sales (id, created_at, total) VALUES (?, ?, ?)'
  );
  const insertItem = db.prepare(
    `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
     VALUES (?, ?, ?, ?, ?)`
  );

  transaction(() => {
    for (const venta of ventasViejas) {
      insertSale.run(venta.id, venta.created_at, venta.total);
      insertItem.run(venta.id, venta.product_id, venta.quantity, venta.unit_price, venta.total);
    }
  });

  db.exec('DROP TABLE sales_old');

  console.log(
    `Migración de ventas: ${ventasViejas.length} venta(s) anterior(es) convertida(s) al nuevo formato (venta + items).`
  );
}

db.exec('PRAGMA foreign_keys = ON');

// Migración: columna "status" en sales, para poder anular una venta
// sin borrar el historial. Las ventas ya existentes quedan como
// 'completed' (valor por defecto).
addColumnIfMissing('sales', 'status', "TEXT NOT NULL DEFAULT 'completed'");
addColumnIfMissing('sales', 'buyer_name', 'TEXT');
addColumnIfMissing('sales', 'delivery_address', 'TEXT');
addColumnIfMissing('sales', 'notes', 'TEXT');
addColumnIfMissing('sales', 'buyer_phone', 'TEXT');
addColumnIfMissing('sales', 'payment_method', 'TEXT');

// ---------------------------------------------------------------
// Migración de sale_items: antes, "product_id" era obligatorio y el
// nombre/talle/color del producto se traían con un JOIN a products
// en el momento de mostrarlos. Eso ataba la posibilidad de borrar un
// producto a si tuvo ventas alguna vez.
//
// Ahora cada ítem de venta guarda su propia "foto" del producto
// (nombre, talle, color) tal como era al momento de venderse, y
// "product_id" pasa a ser opcional: si el producto se borra después,
// el ítem queda con product_id en NULL pero conserva sus datos
// congelados — el ticket y el historial se siguen viendo bien.
// ---------------------------------------------------------------

db.exec('PRAGMA foreign_keys = OFF');

const saleItemsEsEsquemaViejo =
  tableExists('sale_items') && !columnsOf('sale_items').includes('product_name');

if (saleItemsEsEsquemaViejo) {
  db.exec('ALTER TABLE sale_items RENAME TO sale_items_old');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    product_size TEXT,
    product_color TEXT,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

if (saleItemsEsEsquemaViejo) {
  // Para las filas que ya existían, se usa el nombre/talle/color
  // ACTUAL del producto como mejor aproximación posible (esas ventas
  // viejas nunca tuvieron una foto congelada propia). Si el producto
  // ya no existe, queda "Producto eliminado" en vez de perder la fila.
  const filasViejas = db
    .prepare(
      `SELECT si.*, p.name AS p_name, p.size AS p_size, p.color AS p_color
       FROM sale_items_old si
       LEFT JOIN products p ON p.id = si.product_id`
    )
    .all();

  const insertItemMigrado = db.prepare(`
    INSERT INTO sale_items
      (id, sale_id, product_id, product_name, product_size, product_color, quantity, unit_price, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  transaction(() => {
    for (const fila of filasViejas) {
      insertItemMigrado.run(
        fila.id,
        fila.sale_id,
        fila.product_id,
        fila.p_name || 'Producto eliminado',
        fila.p_size,
        fila.p_color,
        fila.quantity,
        fila.unit_price,
        fila.subtotal
      );
    }
  });

  db.exec('DROP TABLE sale_items_old');

  console.log(
    `Migración de ítems de venta: ${filasViejas.length} ítem(s) migrado(s) al nuevo formato (con foto del producto).`
  );
}

db.exec('PRAGMA foreign_keys = ON');

export default db;
