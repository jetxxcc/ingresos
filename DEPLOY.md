# Deploy de la App en GitHub + Railway / Render

Este archivo describe los pasos para crear el repositorio, subir el código y desplegar la aplicación de Node.js.

## 1. Crear el repositorio en GitHub

1. Abre GitHub y crea un nuevo repositorio.
2. No es necesario agregar README ni .gitignore desde GitHub si ya los tienes localmente.
3. Copia la URL del repositorio, por ejemplo:
   `https://github.com/tu-usuario/ingresos.git`

## 2. Inicializar Git localmente

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
cd C:\Users\elianny\Documents\app\app\ingresos
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/ingresos.git
git push -u origin main
```

> Si ya tienes el repositorio inicializado, omite `git init` y usa solo `git add .`, commit y push.

## 3. Configurar el repositorio de Node.js

Asegúrate de que `package.json` tiene estas entradas:

```json
"main": "index.js",
"scripts": {
  "start": "node index.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

## 4. Usar Railway o Render

### Railway

1. Crea una cuenta y selecciona "New Project".
2. Conecta tu repositorio de GitHub.
3. Elige deploy from GitHub.
4. En la configuración, usa:
   - Build command: `npm install`
   - Start command: `npm start`
5. Despliega.

### Render

1. Crea una cuenta en Render.
2. Selecciona "New Web Service".
3. Conecta tu repositorio de GitHub.
4. Configura:
   - Environment: `Node`
   - Build command: `npm install`
   - Start command: `npm start`
5. Despliega.

## 5. Ruta pública

Una vez desplegado, la ruta pública de reserva será:

- `https://<tu-app>.onrender.com/reservar-cita`
- o `https://<tu-app>.railway.app/reservar-cita`

## 6. Notas adicionales

- Tu app necesita acceso al archivo SQLite local.
- En deploy gratuito, la persistencia de archivos puede resetearse si el contenedor se redeploya.
- Para producción, lo ideal es migrar la DB a un servicio SQL externo en el futuro.
