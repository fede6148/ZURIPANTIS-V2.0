// index.js
// Punto de entrada del servidor.

import app from './app.js';
import dotenv from 'dotenv';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execFile } from 'child_process';
import { getUserByEmailModel } from './src/models/users.model.js';
import { createUserService, updateUserService } from './src/services/users.service.js';
dotenv.config();

let __dirname;
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = path.dirname(process.execPath);
}

const PUERTO_PREFERIDO = Number(process.env.PORT) || 3001;
const MAX_INTENTOS_DE_PUERTO = 10;

// Email fijo del unico usuario del sistema. No es un mail real que
// vaya a recibir nada: es solo el identificador interno de login.
const ADMIN_EMAIL = 'admin@zuripantis.local';

// Si el instalador dejo una contraseña pendiente de aplicar (definida
// en la pantalla del wizard), la usamos para crear o actualizar el
// usuario unico del sistema, y borramos el archivo.
const aplicarPasswordInicial = async () => {
  const archivoPassword = path.join(__dirname, '.pending-password.txt');

  if (!fs.existsSync(archivoPassword)) {
    return;
  }

  const password = fs.readFileSync(archivoPassword, 'utf8').trim();

  if (password) {
    const existente = await getUserByEmailModel(ADMIN_EMAIL);

    if (existente) {
      await updateUserService(existente.id, { password });
    } else {
      await createUserService({
        name: 'Administrador',
        email: ADMIN_EMAIL,
        password,
        role: 'admin'
      });
    }

    console.log('Contraseña de acceso configurada desde el instalador.');
  }

  fs.unlinkSync(archivoPassword);
};

const obtenerIpsDeRed = () => {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const nombre of Object.keys(interfaces)) {
    for (const info of interfaces[nombre]) {
      if (info.family === 'IPv4' && !info.internal) {
        ips.push(info.address);
      }
    }
  }

  return ips;
};

const abrirNavegador = (url) => {
  if (process.platform === 'win32') {
    execFile('explorer', [url], (error) => {
      if (error) {
        console.log(`No se pudo abrir el navegador solo. Entrá manualmente a ${url}`);
      }
    });
    return;
  }

  const comando = process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(comando, (error) => {
    if (error) {
      console.log(`No se pudo abrir el navegador solo. Entrá manualmente a ${url}`);
    }
  });
};

const iniciarServidor = (puerto, intento = 0) => {
  const server = app.listen(puerto, '0.0.0.0', () => {
    const urlLocal = `http://localhost:${puerto}`;

    console.log(`Servidor corriendo en puerto ${puerto}`);
    console.log(`  En esta PC:        ${urlLocal}`);

    const ips = obtenerIpsDeRed();
    if (ips.length > 0) {
      for (const ip of ips) {
        console.log(`  Desde otra PC:      http://${ip}:${puerto}`);
      }
    } else {
      console.log('  (No se detectó una red local activa)');
    }

    abrirNavegador(urlLocal);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && intento < MAX_INTENTOS_DE_PUERTO) {
      console.log(`El puerto ${puerto} ya está en uso (probablemente por otro programa). Probando con el ${puerto + 1}...`);
      iniciarServidor(puerto + 1, intento + 1);
    } else {
      console.error(`No se pudo iniciar el servidor: ${error.message}`);
    }
  });
};

(async () => {
  await aplicarPasswordInicial();
  iniciarServidor(PUERTO_PREFERIDO);
})();
