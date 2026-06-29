const express = require('express');
const router = express.Router();
const db = require('../models/db.js');

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}; 


// Ruta para administrar productos
router.get('/admin/productos', requireAuth, (req, res) => {
    db.all(`
        SELECT secciones.id AS seccion_id, secciones.nombre AS seccion_nombre,
               productos.id AS producto_id, productos.nombre AS producto_nombre, productos.precio
        FROM secciones
        LEFT JOIN productos ON productos.seccion_id = secciones.id
    `, (err, filas) => {
        if (err) return res.status(500).send("Error al cargar datos");

        const seccionesMap = {};

        filas.forEach(row => {
            if (!seccionesMap[row.seccion_id]) {
                seccionesMap[row.seccion_id] = {
                    id: row.seccion_id,
                    nombre: row.seccion_nombre,
                    productos: []
                };
            }

            if (row.producto_id) {
                seccionesMap[row.seccion_id].productos.push({
                    id: row.producto_id,
                    nombre: row.producto_nombre,
                    precio: row.precio
                });
            }
        });

        const secciones = Object.values(seccionesMap);
        
        res.render('index', {
            title: 'Administrar Productos',
            activePage: '/admin/productos',
            is_admin: req.session.is_admin || false,
            template: 'admin-productos',
            secciones
        });
    });
});

// API para obtener secciones (sin renderizar toda la página)
router.get('/api/obtener-secciones', requireAuth, (req, res) => {
    db.all(`
        SELECT secciones.id AS seccion_id, secciones.nombre AS seccion_nombre,
               productos.id AS producto_id, productos.nombre AS producto_nombre, productos.precio
        FROM secciones
        LEFT JOIN productos ON productos.seccion_id = secciones.id
    `, (err, filas) => {
        if (err) return res.status(500).json({ error: "Error al cargar datos" });

        const seccionesMap = {};

        filas.forEach(row => {
            if (!seccionesMap[row.seccion_id]) {
                seccionesMap[row.seccion_id] = {
                    id: row.seccion_id,
                    nombre: row.seccion_nombre,
                    productos: []
                };
            }

            if (row.producto_id) {
                seccionesMap[row.seccion_id].productos.push({
                    id: row.producto_id,
                    nombre: row.producto_nombre,
                    precio: row.precio
                });
            }
        });

        const secciones = Object.values(seccionesMap);
        res.json({ secciones });
    });
});

// POST: Crear sección
router.post('/AdministrarProductos', requireAuth, (req, res) => {
    const nombre = req.body.seccion;

    db.run('INSERT INTO secciones(nombre) VALUES(?)', [nombre], err => {
        if (err) return res.status(500).json({ error: "Error al crear sección" });
        res.json({ success: true });
    });
});

// POST: Agregar producto
router.post('/AdministrarProductos/agregar', requireAuth, (req, res) => {
    const { seccion_id, producto, precio } = req.body;

    db.run(
        'INSERT INTO productos(nombre, precio, seccion_id) VALUES(?, ?, ?)',
        [producto, precio, seccion_id],
        function (err) {
            if (err) {
                console.error("Error al insertar producto:", err.message);
                return res.status(500).json({ error: "Error al agregar producto" });
            }
            res.json({ success: true });
        }
    );
});

// POST: Eliminar producto
router.post('/AdministrarProductos/eliminarProducto/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM productos WHERE id = ?', [id], err => {
        if (err) return res.status(500).json({ error: 'Error al eliminar producto' });
        res.json({ success: true });
    });
});

// POST: Editar producto
router.post('/AdministrarProductos/editarProducto/:id', requireAuth, (req, res) => {
    const { nombre, precio } = req.body;
    const { id } = req.params;
    
    db.run('UPDATE productos SET nombre = ?, precio = ? WHERE id = ?', [nombre, precio, id], err => {
        if (err) return res.status(500).json({ error: 'Error al editar producto' });
        res.json({ success: true });
    });
});

// POST: Eliminar sección
router.post('/AdministrarProductos/eliminarSeccion/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM secciones WHERE id = ?', [id], err => {
        if (err) return res.status(500).json({ error: 'Error al eliminar sección' });
        res.json({ success: true });
    });
});

// POST: Editar sección
router.post('/AdministrarProductos/editarSeccion/:id', requireAuth, (req, res) => {
    const { nombre } = req.body;
    const { id } = req.params;
    
    db.run('UPDATE secciones SET nombre = ? WHERE id = ?', [nombre, id], err => {
        if (err) return res.status(500).json({ error: 'Error al editar sección' });
        res.json({ success: true });
    });
});

module.exports = router;