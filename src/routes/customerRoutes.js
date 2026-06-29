
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


// Ruta para crear cliente (ventana doble)
router.get('/crear-cliente', requireAuth, (req, res) => {
    // Obtener todos los clientes para mostrar en la ventana derecha
    db.all(`SELECT id, nombre, apellido, telefono, direccion FROM clientes ORDER BY nombre`, (err, clientes) => {
        if (err) {
            console.error('Error al obtener clientes:', err);
            return res.status(500).send("Error al obtener clientes");
        }

        res.render('index', {
            title: 'Crear Cliente',
            activePage: '/crear-cliente',
            is_admin: req.session.is_admin || false,
            template: 'create-order-loading',
            doubleWindow: {
                left: 'create-customer-left',
                right: 'create-customer-right'
            },
            clientes: clientes || []
        });
    });
});

// API para obtener clientes actualizado
router.get('/api/obtener-clientes', requireAuth, (req, res) => {
    db.all(`SELECT id, nombre, apellido, telefono, direccion FROM clientes ORDER BY nombre`, (err, clientes) => {
        if (err) {
            console.error('Error al obtener clientes:', err);
            return res.status(500).json({ error: "Error al obtener clientes" });
        }
        res.json({ clientes: clientes || [] });
    });
});

// POST: Insertar cliente
router.post('/insertCliente', requireAuth, (req, res) => {
    const { nombre, apellido, telefono, direccion } = req.body;

    console.log('Datos recibidos:', req.body); // Para debug

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    if (!apellido || apellido.trim() === '') {
        return res.status(400).json({ error: "El apellido es obligatorio" });
    }

    const nombreTrim = nombre.trim();
    const apellidoTrim = apellido.trim();
    const telefonoTrim = telefono ? telefono.trim() : '';

    // Verificar duplicado por nombre completo (nombre + apellido)
    db.get(
        `SELECT id FROM clientes WHERE LOWER(nombre) = LOWER(?) AND LOWER(apellido) = LOWER(?)`,
        [nombreTrim, apellidoTrim],
        (err, clienteExistente) => {
            if (err) {
                console.error('Error verificando nombre duplicado:', err);
                return res.status(500).json({ error: "Error al verificar duplicados" });
            }

            if (clienteExistente) {
                return res.status(400).json({ 
                    error: `Ya existe un cliente con el nombre "${nombreTrim} ${apellidoTrim}"` 
                });
            }

            // Verificar duplicado por teléfono (solo si el teléfono no está vacío)
            if (telefonoTrim) {
                db.get(
                    `SELECT id, nombre, apellido FROM clientes WHERE telefono = ? AND telefono != ''`,
                    [telefonoTrim],
                    (err, clienteTelefono) => {
                        if (err) {
                            console.error('Error verificando teléfono duplicado:', err);
                            return res.status(500).json({ error: "Error al verificar duplicados" });
                        }

                        if (clienteTelefono) {
                            return res.status(400).json({ 
                                error: `El teléfono "${telefonoTrim}" ya está registrado con el cliente ${clienteTelefono.nombre} ${clienteTelefono.apellido}` 
                            });
                        }

                        // Si no hay duplicados, insertar
                        insertarCliente();
                    }
                );
            } else {
                // Si no hay teléfono, insertar directamente
                insertarCliente();
            }
        }
    );

    // Función para insertar el cliente
    function insertarCliente() {
        db.run(
            `INSERT INTO clientes (nombre, apellido, telefono, direccion) VALUES (?, ?, ?, ?)`,
            [nombreTrim, apellidoTrim, telefonoTrim, direccion ? direccion.trim() : ''],
            function(err) {
                if (err) {
                    console.error('Error al insertar cliente:', err);
                    return res.status(500).json({ error: "Error al guardar el cliente" });
                }
                console.log('Cliente insertado con ID:', this.lastID);
                res.json({ success: true, id: this.lastID });
            }
        );
    }
});

// POST: Eliminar cliente
router.post('/eliminarCliente/:id', requireAuth, (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM clientes WHERE id = ?`, [id], function(err) {
        if (err) {
            console.error('Error al eliminar cliente:', err);
            return res.status(500).json({ error: "Error al eliminar el cliente" });
        }
        res.json({ success: true });
    });
});


// POST: Editar cliente
router.post('/editarCliente/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, telefono, direccion } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    if (!apellido || apellido.trim() === '') {
        return res.status(400).json({ error: "El apellido es obligatorio" });
    }

     const nombreTrim = nombre.trim();
    const apellidoTrim = apellido.trim();
    const telefonoTrim = telefono ? telefono.trim() : '';

    // Verificar duplicado por nombre completo (excluyendo el cliente actual)
    db.get(
        `SELECT id FROM clientes WHERE LOWER(nombre) = LOWER(?) AND LOWER(apellido) = LOWER(?) AND id != ?`,
        [nombreTrim, apellidoTrim, id],
        (err, clienteExistente) => {
            if (err) {
                console.error('Error verificando nombre duplicado:', err);
                return res.status(500).json({ error: "Error al verificar duplicados" });
            }

            if (clienteExistente) {
                return res.status(400).json({ 
                    error: `Ya existe otro cliente con el nombre "${nombreTrim} ${apellidoTrim}"` 
                });
            }

            // Verificar duplicado por teléfono (excluyendo el cliente actual)
            if (telefonoTrim) {
                db.get(
                    `SELECT id, nombre, apellido FROM clientes WHERE telefono = ? AND telefono != '' AND id != ?`,
                    [telefonoTrim, id],
                    (err, clienteTelefono) => {
                        if (err) {
                            console.error('Error verificando teléfono duplicado:', err);
                            return res.status(500).json({ error: "Error al verificar duplicados" });
                        }

                        if (clienteTelefono) {
                            return res.status(400).json({ 
                                error: `El teléfono "${telefonoTrim}" ya está registrado con otro cliente: ${clienteTelefono.nombre} ${clienteTelefono.apellido}` 
                            });
                        }

                        // Si no hay duplicados, actualizar
                        actualizarCliente();
                    }
                );
            } else {
                // Si no hay teléfono, actualizar directamente
                actualizarCliente();
            }
        }
    );

    // Función para actualizar el cliente
    function actualizarCliente() {
        db.run(
            `UPDATE clientes SET nombre = ?, apellido = ?, telefono = ?, direccion = ? WHERE id = ?`,
            [nombreTrim, apellidoTrim, telefonoTrim, direccion ? direccion.trim() : '', id],
            function(err) {
                if (err) {
                    console.error('Error al actualizar cliente:', err);
                    return res.status(500).json({ error: "Error al actualizar el cliente" });
                }
                res.json({ success: true });
            }
        );
    }
});

module.exports = router;