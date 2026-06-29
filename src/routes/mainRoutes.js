const express = require('express');
const router = express.Router();
const db = require('../models/db.js');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs'); // Módulo de Node para manejo de archivos





// router.use((req, res, next) => {
//     // Agregar esta función antes de las rutas
//     res.locals.includeContent = function (templateName, data = {}) {

//         try {
//             const templatePath = path.join(__dirname, '..', 'views', 'partials', 'content', `${templateName}.ejs`);

//             if (fs.existsSync(templatePath)) {
//                 const template = fs.readFileSync(templatePath, 'utf8');
//                 return ejs.render(template, { ...data, ...this }); // Incluir contexto
//             } else {
//                 console.warn(`Template ${templateName} no encontrado en ${templatePath}`);
//                 return `<p>Template ${templateName} no encontrado</p>`;
//             }
//         } catch (error) {
//             console.error(`Error rendering template ${templateName}:`, error);
//             return `<p>Error al cargar ${templateName}</p>`;
//         }
//     };
//     next()

// })

router.use((req, res, next) => {
    res.locals.includeContent = function (templateName, data = {}) {
        try {
            // 🔹 Directorios base
            const baseDir = path.join(__dirname, '..', 'views', 'partials', 'content');
            const segundoDir = path.join(baseDir, 'administrator-windows');
            const terceroDir = path.join(baseDir, 'windows-of-creations')
            const cuartoDir = path.join(baseDir, 'query-windows')

            // 🔹 Rutas posibles
            const possiblePaths = [
                path.join(baseDir, `${templateName}.ejs`),
                path.join(segundoDir, `${templateName}.ejs`),
                path.join(terceroDir, `${templateName}.ejs`),
                path.join(cuartoDir, `${templateName}.ejs`)
            ];

            // 🔹 Buscar el primer archivo existente
            let foundPath = null;
            for (const possiblePath of possiblePaths) {
                if (fs.existsSync(possiblePath)) {
                    foundPath = possiblePath;
                    break;
                }
            }

            // 🔹 Renderizar si se encontró
            if (foundPath) {
                const template = fs.readFileSync(foundPath, 'utf8');
                return ejs.render(template, { ...data, ...this });
            } else {
                console.warn(`Template ${templateName} no encontrado en las rutas definidas`);
                return `<p>Template ${templateName} no encontrado</p>`;
            }
        } catch (error) {
            console.error(`Error renderizando template ${templateName}:`, error);
            return `<p>Error al cargar ${templateName}</p>`;
        }
    };

    next();
});


// Agregar después del middleware del helper includeContent
router.use((req, res, next) => {
    // Solo agregar userData si el usuario está autenticado
    // se lo agrega a todas las rutas el userData
    if (req.session && req.session.userId) {
        res.locals.userData = {
            name: req.session.userName || 'Usuario',
            id: req.session.userId,
            is_admin: req.session.is_admin || false
        };
    }
    next();
});





// Ruta para crear pedido - CON VENTANA DOBLE

// router.get('/crear-pedido', requireAuth, (req, res) => {
//     res.render('index', {
//         title: 'Crear Pedido',
//         activePage: '/crear-pedido',
//         is_admin: req.session.is_admin || false,
//         template: 'create-order-loading',
//         doubleWindow: {
//             left: 'create-order-left',
//             right: 'create-order-right'
//         }
//     });
// });

// // Ruta para administrar clientes
// router.get('/admin/clientes', requireAuth, (req, res) => {
//     res.render('index', {
//         title: 'Administrar Clientes',
//         activePage: '/admin/clientes',
//         is_admin: req.session.is_admin || false,
//         template: 'admin-clientes'
//     });
// });

// // Ruta para consultar pedidos
// router.get('/consultar-pedidos', requireAuth, (req, res) => {
//     res.render('index', {
//         title: 'Consultar Pedidos',
//         activePage: '/consultar-pedidos',
//         is_admin: req.session.is_admin || false,
//         template: 'consultar-pedidos'
//     });
// });

// Ruta para calendario
// router.get('/calendar', requireAuth, (req, res) => {
//     res.render('index', {
//         title: 'Calendario',
//         activePage: '/calendar',
//         is_admin: req.session.is_admin || false,
//         template: 'calendar'
//     });
// });



// router.get('/', (req, res) => {
//   // Si no hay sesión, redirige al login
//       if (!req.session.userId) {
//         return res.redirect('/login');
//     }
//     // Pasa el valor de is_admin a la vista
//     // Si la sesión no tiene is_admin (ej. si el usuario es nuevo), por defecto será false
//     const is_admin = req.session.is_admin || false; 

//   res.render('index', {is_admin: is_admin})
//   // res.sendFile(path.join(__dirname, '../views/index.html'));
// });



// router.get('/AdministrarProductos', (req, res) => {
// db.all(`
//   SELECT secciones.id AS seccion_id, secciones.nombre AS seccion_nombre,
//          productos.id AS producto_id, productos.nombre AS producto_nombre, productos.precio
//   FROM secciones
//   LEFT JOIN productos ON productos.seccion_id = secciones.id
// `, (err, filas) => {
//   if (err) return res.status(500).send("Error al cargar datos");

//   const seccionesMap = {};

//   filas.forEach(row => {
//     if (!seccionesMap[row.seccion_id]) {
//       seccionesMap[row.seccion_id] = {
//         id: row.seccion_id,
//         nombre: row.seccion_nombre,
//         productos: []
//       };
//     }

//     if (row.producto_id) {
//       seccionesMap[row.seccion_id].productos.push({
//         id: row.producto_id,
//         nombre: row.producto_nombre,
//         precio: row.precio
//       });
//     }
//   });

//   const secciones = Object.values(seccionesMap);
//   res.render('index', { secciones });
// });

// });



// // Ruta POST para agregar productos
// router.post('/AdministrarProductos', (req, res) => {
//   const nombre = req.body.seccion;

//   db.run('INSERT INTO secciones(nombre) VALUES(?)', [nombre], err => {
//     if (err) return res.status(500).send("Error al crear sección");
//     res.redirect('/AdministrarProductos');
//   });
// });


// router.post('/AdministrarProductos/agregar', (req, res) => {
//   const { seccion_id, producto, precio } = req.body;



//   db.run(
//     'INSERT INTO productos(nombre, precio, seccion_id) VALUES(?, ?, ?)',
//     [producto, precio, seccion_id],
//     function (err) {
//       if (err) {
//         console.error("Error al insertar producto:", err.message);
//         return res.status(500).send("Error al agregar producto");
//       }

//       res.redirect('/AdministrarProductos');
//     }
//   );
// });

// router.post('/AdministrarProductos/eliminarProducto/:id', (req, res) => {
//   const { id } = req.params;


//   db.run('DELETE FROM productos WHERE id = ?', [id], err => {
//     if (err) return res.status(500).send('Error al eliminar producto');
//     res.redirect('/AdministrarProductos');
//   });
// });

// router.post('/AdministrarProductos/editarProducto/:id', (req, res) => {
//   const { nombre, precio } = req.body;
//   const { id } = req.params;
//   db.run('UPDATE productos SET nombre = ?, precio = ? WHERE id = ?', [nombre, precio, id], err => {
//     if (err) return res.status(500).send('Error al editar producto');
//     res.redirect('/AdministrarProductos');
//   });
// });


// router.post('/AdministrarProductos/eliminarSeccion/:id', (req, res) => {
//   const { id } = req.params;
//   db.run('DELETE FROM secciones WHERE id = ?', [id], err => {
//     if (err) return res.status(500).send('Error al eliminar sección');
//     res.redirect('/AdministrarProductos');
//   });
// });


// router.post('/AdministrarProductos/editarSeccion/:id', (req, res) => {
//   const { nombre } = req.body;
//   const { id } = req.params;
//   db.run('UPDATE secciones SET nombre = ? WHERE id = ?', [nombre, id], err => {
//     if (err) return res.status(500).send('Error al editar sección');
//     res.redirect('/AdministrarProductos');
//   });
// });








module.exports = router;
