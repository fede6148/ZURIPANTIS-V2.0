// src/seeders/users.seeder.js
// Carga usuarios de prueba en Firestore.

import dotenv from 'dotenv';
dotenv.config();

// Importamos los servicios y modelos necesarios
import { createUserService } from '../services/users.service.js';
import { getUserByEmailModel } from '../models/users.model.js';

// Definimos algunos usuarios de prueba
const testUsers = [
  { name: 'Federico Melga', email: 'fede@test.com', password: 'Test123!', role: 'admin' },
  { name: 'Ana Lucia Melga', email: 'ana@test.com', password: 'Test123!', role: 'user' },
  { name: 'Florencia Rodz', email: 'flor@test.com', password: 'Test123!', role: 'user' }
];

const seedUsers = async () => {
  console.log('Iniciando seeder de usuarios...');

  for (const user of testUsers) {
    const existing = await getUserByEmailModel(user.email);

    if (existing) {
      console.log(`  Usuario ${user.email} ya existe, salteando...`);
      continue;
    }

    const id = await createUserService(user);
    console.log(`  Usuario creado: ${user.name} (${id})`);
  }

  console.log('Seeder finalizado.');
  process.exit(0);
};

seedUsers().catch((err) => {
  console.error('Error en el seeder:', err);
  process.exit(1);
});

