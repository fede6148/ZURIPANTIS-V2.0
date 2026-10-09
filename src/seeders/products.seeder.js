// src/seeders/products.seeder.js
// Carga productos de prueba en la base de datos local (SQLite).
//
// Nota: en la versión con Firestore este seeder usaba "title" como
// nombre de campo, pero el modelo y el middleware de validación
// esperan "name". Se corrige acá para que los datos de prueba sean
// consistentes con el resto del proyecto.

import db from '../config/database.js';

const productsSeeders = [
  {
    name: 'Mouse Inalambrico Logitech M185',
    description: 'Mouse compacto, comodo y de larga duracion de bateria.',
    price: 12.99,
    stock: 40,
  },
  {
    name: 'Teclado Mecanico Redragon Kumara',
    description: 'Teclado mecanico tenkeyless con retroiluminacion roja.',
    price: 39.9,
    stock: 18,
  },
  {
    name: 'Monitor Samsung 24 Pulgadas FHD',
    description: 'Pantalla IPS Full HD ideal para trabajo y estudio diario.',
    price: 149.99,
    stock: 12,
  },
  {
    name: 'Audifonos Bluetooth JBL Tune 510BT',
    description: 'Audifonos inalambricos con buen sonido y bateria duradera.',
    price: 55,
    stock: 25,
  },
  {
    name: 'Disco SSD Kingston 480GB',
    description: 'Unidad SSD para acelerar arranque y carga de aplicaciones.',
    price: 34.5,
    stock: 30,
  },
];

const insertStmt = db.prepare(
  'INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)'
);

const createProducts = () => {
  console.log('Iniciando seeder de productos...');

  for (const product of productsSeeders) {
    insertStmt.run(product.name, product.description, product.price, product.stock);
    console.log(`  Producto creado: ${product.name}`);
  }

  console.log('Seeder finalizado.');
};

createProducts();
