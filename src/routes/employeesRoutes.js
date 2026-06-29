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


// Ruta para administrar empleados (ventana doble)
router.get('/admin/empleados', requireAuth, (req, res) => {
    db.all(`SELECT id, name FROM employees ORDER BY name`, (err, empleados) => {
        if (err) {
            console.error('Error al obtener empleados:', err);
            return res.status(500).send("Error al obtener empleados");
        }

        res.render('index', {
            title: 'Administrar Empleados',
            activePage: '/admin/empleados',
            is_admin: req.session.is_admin || false,
            template: 'create-order-loading',
            doubleWindow: {
                left: 'admin-employees-left',
                right: 'admin-employees-right'
            },
            empleados: empleados || []
        });
    });
});

// API para obtener empleados
router.get('/api/obtener-empleados', requireAuth, (req, res) => {
    db.all(`SELECT id, name FROM employees ORDER BY name`, (err, empleados) => {
        if (err) {
            console.error('Error al obtener empleados:', err);
            return res.status(500).json({ error: "Error al obtener empleados" });
        }
        res.json({ empleados: empleados || [] });
    });
});

// POST: Insertar empleado
router.post('/insertEmpleado', requireAuth, (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const nameTrim = name.trim();

    // Verificar duplicado por nombre
    db.get(
        `SELECT id FROM employees WHERE LOWER(name) = LOWER(?)`,
        [nameTrim],
        (err, empleadoExistente) => {
            if (err) {
                console.error('Error verificando nombre duplicado:', err);
                return res.status(500).json({ error: "Error al verificar duplicados" });
            }

            if (empleadoExistente) {
                return res.status(400).json({ 
                    error: `Ya existe un empleado con el nombre "${nameTrim}"` 
                });
            }

            // Insertar
            db.run(
                `INSERT INTO employees (name) VALUES (?)`,
                [nameTrim],
                function(err) {
                    if (err) {
                        console.error('Error al insertar empleado:', err);
                        return res.status(500).json({ error: "Error al guardar el empleado" });
                    }
                    res.json({ success: true, id: this.lastID });
                }
            );
        }
    );
});

// POST: Eliminar empleado
router.post('/eliminarEmpleado/:id', requireAuth, (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM employees WHERE id = ?`, [id], function(err) {
        if (err) {
            console.error('Error al eliminar empleado:', err);
            return res.status(500).json({ error: "Error al eliminar el empleado" });
        }
        res.json({ success: true });
    });
});

// POST: Editar empleado
router.post('/editarEmpleado/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const nameTrim = name.trim();

    // Verificar duplicado por nombre (excluyendo el empleado actual)
    db.get(
        `SELECT id FROM employees WHERE LOWER(name) = LOWER(?) AND id != ?`,
        [nameTrim, id],
        (err, empleadoExistente) => {
            if (err) {
                console.error('Error verificando nombre duplicado:', err);
                return res.status(500).json({ error: "Error al verificar duplicados" });
            }

            if (empleadoExistente) {
                return res.status(400).json({ 
                    error: `Ya existe otro empleado con el nombre "${nameTrim}"` 
                });
            }

            // Actualizar
            db.run(
                `UPDATE employees SET name = ? WHERE id = ?`,
                [nameTrim, id],
                function(err) {
                    if (err) {
                        console.error('Error al actualizar empleado:', err);
                        return res.status(500).json({ error: "Error al actualizar el empleado" });
                    }
                    res.json({ success: true });
                }
            );
        }
    );
});

module.exports = router;