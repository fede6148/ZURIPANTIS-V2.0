@echo off
title Zuripantis - Sistema de stock y ventas
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo No se encontro Node.js instalado en esta PC.
  echo Instalalo desde https://nodejs.org ^(version LTS^) y volve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo ===============================================
  echo  Primera vez que se usa: instalando dependencias.
  echo  Esto puede tardar unos minutos, no cierres esta ventana.
  echo ===============================================
  call npm install
  if errorlevel 1 (
    echo.
    echo Hubo un error instalando las dependencias. Revisa el mensaje de arriba.
    pause
    exit /b 1
  )
  echo.
  echo Dependencias instaladas correctamente.
  echo.
)

echo Iniciando el servidor de Zuripantis...
start "Zuripantis - Servidor (no cerrar mientras usas el sistema)" cmd /k node index.js

timeout /t 3 /nobreak >nul

start "" http://localhost:3000

echo.
echo ===============================================
echo  El sistema deberia haberse abierto en tu navegador.
echo  Si no se abrio solo, entra manualmente a:
echo      http://localhost:3000
echo.
echo  Para CERRAR el sistema: cerra la ventana negra
echo  titulada "Zuripantis - Servidor".
echo ===============================================
echo.
pause
