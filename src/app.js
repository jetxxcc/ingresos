const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const fs = require('fs');
const app = express();



app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Configurar motor de vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('view options', {
    include: function(path, data) {
    return require('ejs').renderFile(path, data);
    }
});

// Middleware para JSON (si usas datos tipo JSON) o (si quieres servir CSS o JS después) INVESTIGAR
// 1. Configuración para archivos estáticos en la carpeta 'public' de la raíz
app.use(express.static(path.join(__dirname, 'public')));







// Asegurar que la carpeta de sesiones exista en deploy
const sessionsDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

// Configuración de sesiones
app.use(session({
        store: new SQLiteStore({
        db: 'sessions.db', // Nombre del archivo de la base de datos para sesiones
        table: 'sessions', // Nombre de la tabla para almacenar sesiones
        dir: './data', // Directorio donde se guardará la DB
        concurrentDB: true // Permite múltiples conexiones

//         Cuando un servidor se reinicia, como lo hace con nodemon o PM2, la memoria de la aplicación se borra. Si la sesión se almacena en la memoria del servidor (que es el comportamiento por defecto de express-session), todos los datos de la sesión se pierden, y los usuarios son forzados a iniciar sesión de nuevo.

// La solución a este problema es utilizar un almacén de sesiones que persista los datos de la sesión fuera de la memoria volátil del servidor. Como te mencioné, connect-sqlite3 es una excelente opción porque usa tu base de datos SQLite existente.

// La única forma de mantener la sesión "presente" a pesar de los reinicios es a través de un almacén de sesiones persistente. Las cookies de sesión en el navegador solo contienen el sessionId, no los datos completos de la sesión. El servidor usa ese sessionId para buscar los datos completos en su almacén. Si el almacén se borra (al reiniciarse), el servidor no puede encontrar los datos de la sesión, sin importar si la cookie aún existe en el navegador.

// Por lo tanto, la solución que te propuse de usar connect-sqlite3 es la única manera de lograr lo que pides. Es un paso necesario para que tu aplicación funcione correctamente en un entorno de producción (o de desarrollo con reinicios frecuentes) y para que la experiencia del usuario sea fluida.
    }),
    name: 'sessionId', // Nombre personalizado de la cookie (menos obvio que el default)
    secret: process.env.SESSION_SECRET || 'tu_secreto_muy_seguro', // Cambia esto por una cadena aleatoria
    resave: false,
    saveUninitialized: false, // Configura en false para evitar crear sesiones vacías
    cookie: { 
         maxAge: 24 * 60 * 60 * 1000, // Duración de la cookie: 24 horas en milisegundos
        secure: false, // ¡IMPORTANTE! 'true' solo si usas HTTPS. Si no, debe ser 'false'
        httpOnly: true, // Previene que JavaScript del lado del cliente acceda a la cookie 
        sameSite: 'strict' // Previene CSRF
    },
     rolling: true // Renueva la sesión en cada request (mantiene la sesión activa)
}));

// Middleware para hacer datos de sesión disponibles en todas las vistas
app.use((req, res, next) => {
    res.locals.currentUser = req.session.userId ? {
        id: req.session.userId,
        username: req.session.username,
        name: req.session.name,
        is_admin: req.session.is_admin
    } : null;
    next();
});

// ===== NUEVO: Sistema de Backup Automático =====
const startAutoBackup = () => {
    console.log('=== INICIANDO SISTEMA DE BACKUP AUTOMÁTICO ===');
    
    // Esperar 2 minutos antes del primer backup para que la app esté totalmente estable
    setTimeout(() => {
        const BackupHelper = require('./helpers/backupHelper');
        const backupHelper = new BackupHelper();
        
        // Configurar backups automáticos cada 1 hora
        const BACKUP_INTERVAL = 60 * 60 * 1000;
        
        // Función para ejecutar el backup
        const executeBackup = async () => {
            try {
                console.log('--- Ejecutando backup automático ---');
                console.log('Hora:', new Date().toLocaleString());
                
                await backupHelper.makeAutoBackup();
                console.log('Backup completado exitosamente');
                console.log('Próximo backup en 1 hora...');
                
            } catch (error) {
                console.error('Error en backup automático:', error.message);
                console.log('Reintentando en 10 minutos...');
                
                // Reintentar después de 10 minutos si falla
                setTimeout(executeBackup, 10 * 60 * 1000);
            }
        };
        
        // Primer backup
        executeBackup();
        
        // Programar backups periódicos cada hora
        setInterval(executeBackup, BACKUP_INTERVAL);
        
    }, 2 * 60 * 1000); // 2 minutos de espera inicial
};

// Iniciar el sistema de backup automáticamente
startAutoBackup();

// Importar y usar rutas





const mainRoutes = require('./routes/mainRoutes');
app.use('/', mainRoutes);

const authRoutes = require('./routes/authRoutes');
app.use('/', authRoutes);

const dashBoardRoutes = require('./routes/dashBoardRoutes');
app.use('/', dashBoardRoutes)

const employeesRoutes = require('./routes/employeesRoutes');
app.use('/', employeesRoutes);

const customerRoutes = require('./routes/customerRoutes');
app.use('/', customerRoutes);

const adminProductRoutes = require('./routes/adminProductRoutes');
app.use('/', adminProductRoutes);

const createOrderRoutes = require('./routes/createOrderRoutes');
app.use('/', createOrderRoutes);

const orderInquiryRoutes = require('./routes/orderInquiryRoutes');
app.use('/', orderInquiryRoutes);

const comissionRoutes= require('./routes/comissionRoutes');
app.use('/', comissionRoutes);



const appointmentsRoutes = require('./routes/appointmentsRoutes');
app.use('/', appointmentsRoutes);

const AppointmentSyncHelper = require('./helpers/appointmentSyncHelper');
const db = require('./models/db.js');

const syncHelper = new AppointmentSyncHelper(db);
setInterval(() => {
  syncHelper.processQueue().catch((error) => {
    console.error('Error procesando cola de citas:', error);
  });
}, 2 * 60 * 1000);

module.exports = app;
