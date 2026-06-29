📦 Guía de Migración de App Node.js con PM2 en Windows

Este documento describe los pasos necesarios para migrar una aplicación Node.js que corre con PM2 en Windows, incluyendo la base de datos y configuración de arranque automático.



1\. Preparación en la nueva laptop/PC

Instalar Node.js y npm



Descarga la versión LTS desde nodejs.org.



Verifica instalación:



powershell

node -v

npm -v

Instalar PM2 globalmente



powershell

npm install -g pm2

Instalar soporte de arranque en Windows



powershell

npm install -g pm2-windows-startup

pm2-startup install

2\. Migración del proyecto

Copiar carpetas del proyecto



Incluye:



Código fuente (src, index.js, etc.)



Archivos de configuración (package.json, .env)



Base de datos (database.db o carpeta db)



Mover a una ruta fuera de OneDrive



Recomendado: C:\\Projects\\app



Evita bloqueos de archivos y problemas de permisos.



Instalar dependencias



powershell

cd C:\\Projects\\app\\ingresos

npm install

3\. Levantar la aplicación con PM2

Iniciar la app



powershell

pm2 start index.js

Verificar estado



powershell

pm2 list

pm2 logs index

Guardar configuración



powershell

pm2 save

4\. Configurar arranque automático en Windows

Instalar servicio de inicio



powershell

pm2-startup install

Resucitar procesos guardados al inicio



PM2 levantará automáticamente los procesos guardados con pm2 save.



5\. Verificación

Reinicia la laptop/PC.



Abre PowerShell y ejecuta:



powershell

pm2 list

Tu proceso index.js debe aparecer como online.



6\. Notas adicionales

Logs: se guardan en C:\\Users\\<usuario>\\.pm2\\logs.



Resucitar manualmente si algo falla:



powershell

pm2 resurrect

Actualizar npm:



powershell

npm install -g npm@latest

✅ Checklist de Migración

\[ ] Node.js y npm instalados



\[ ] PM2 instalado globalmente



\[ ] Proyecto copiado fuera de OneDrive



\[ ] Dependencias reinstaladas con npm install



\[ ] App levantada con pm2 start index.js



\[ ] Configuración guardada con pm2 save



\[ ] Arranque automático configurado con pm2-startup install



\[ ] Verificación de logs y estado en pm2 list

