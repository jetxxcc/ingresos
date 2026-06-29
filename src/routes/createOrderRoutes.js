const express = require('express');
const router = express.Router();
const db = require('../models/db.js');
const { getLocalDateTimeWithAMPM } = require('../helpers/dateHelper');

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}; 

// Ruta para crear pedido con ventanas dobles
router.get('/crear-pedido', requireAuth, (req, res) => {
    // Obtener empleados
    db.all(`SELECT id, name FROM employees`, (err, employees) => {
        if (err) return res.status(500).send("Error al obtener empleados");

        // Obtener clientes
        db.all(`SELECT id, nombre, apellido FROM clientes ORDER BY nombre`, (err, clientes) => {
            if (err) return res.status(500).send("Error al obtener clientes");

            // Obtener productos
            db.all(`SELECT id, nombre, precio FROM productos`, (err, productos) => {
                if (err) return res.status(500).send("Error al obtener productos");

                // Obtener carrito
                db.all(`
                    SELECT c.id, 
                    p.nombre AS producto, 
                    c.producto_precio_carrito AS precio, 
                    c.metodo_pago, 
                    cli.nombre AS cliente_nombre, 
                    cli.apellido AS cliente_apellido,
                    cli.id AS cliente_id, 
                    c.producto_id,
                    e.id AS empleado_id, 
                    e.name AS empleado_nombre 
                    FROM carrito c
                    JOIN productos p ON c.producto_id = p.id
                    JOIN clientes cli ON c.cliente = cli.id
                    LEFT JOIN employees e ON c.empleado_id = e.id
                `, (err2, pedidos) => {
                    if (err2) return res.status(500).send("Error al obtener carrito");

                    const opciones = productos.map(p => ({
                        valor: p.id,
                        textWithPrice: `${p.nombre} - $${p.precio}`,
                        text: p.nombre
                    }));

                    const total = pedidos.reduce((sum, p) => sum + p.precio, 0);
                    const clienteActual = pedidos.length > 0 ? pedidos[0].cliente_id : null;
                    const metodoActual = pedidos.length > 0 ? pedidos[0].metodo_pago : null;
                    const empleadoActual = pedidos.length > 0 ? pedidos[0].empleado_id : null;

                    res.render('index', {
                        title: 'Crear Pedido',
                        activePage: '/crear-pedido',
                        is_admin: req.session.is_admin || false,
                        template: 'create-order-loading',
                        doubleWindow: {
                            left: 'create-order-left',
                            right: 'create-order-right'
                        },
                        // Pasar todos los datos necesarios
                        opciones,
                        clientes,
                        employees,
                        pedidos,
                        total,
                        clienteActual,
                        metodoActual,
                        empleadoActual
                    });
                });
            });
        });
    });
});

// Nueva ruta API para obtener carrito sin renderizar vista completa
router.get('/api/obtener-carrito', requireAuth, (req, res) => {
db.all(`
    SELECT 
        c.id, 
        p.nombre AS producto, 
        c.producto_precio_carrito AS precio, 
        c.metodo_pago, 
        cli.nombre AS cliente_nombre,
        cli.apellido AS cliente_apellido,
        cli.id AS cliente_id, 
        c.producto_id,
        e.id AS empleado_id, 
        e.name AS empleado_nombre 
    FROM carrito c
    JOIN productos p ON c.producto_id = p.id
    JOIN clientes cli ON c.cliente = cli.id
    LEFT JOIN employees e ON c.empleado_id = e.id
`, (err, pedidos) => {
    if (err) return res.status(500).json({ error: "Error al obtener carrito" });

    const total = pedidos.reduce((sum, p) => sum + p.precio, 0);
    const clienteActual = pedidos.length > 0 ? pedidos[0].cliente_id : null;
    const metodoActual = pedidos.length > 0 ? pedidos[0].metodo_pago : null;
    const empleadoActual = pedidos.length > 0 ? pedidos[0].empleado_id : null;

    res.json({
        pedidos,
        total,
        clienteActual,
        metodoActual,
        empleadoActual
    });
});

});

router.post('/Agregar', (req, res) => {
    const { producto, pago, cliente_id, empleado_id } = req.body;

    if (!producto) {
        return res.status(400).json({ error: "Debe seleccionar un producto" });
    }


    if (!empleado_id) {
        return res.status(400).json({ error: "Debe seleccionar un empleado" });
    }

    // Verificar que el empleado existe
    db.get(`SELECT id FROM employees WHERE id = ?`, [empleado_id], (err, empleado) => {
        if (err) return res.status(500).json({ error: "Error al verificar empleado" });
        if (!empleado) return res.status(400).json({ error: "Empleado no válido" });

        // Primero obtenemos el precio del producto
        db.get(`SELECT precio FROM productos WHERE id = ?`, [producto], (err, productoData) => {
            if (err) {
                console.error('Error al obtener producto:', err);
                return res.status(500).json({ error: "Error al obtener producto" });
            }

            if (!productoData) {
                return res.status(404).json({ error: "Producto no encontrado" });
            }

            db.get(`SELECT cliente, metodo_pago FROM carrito LIMIT 1`, (err, row) => {
                if (err) {
                    console.error('Error al verificar carrito:', err);
                    return res.status(500).json({ error: "Error al verificar carrito" });
                }

                let clienteFinal = cliente_id;
                let metodoFinal = pago;
                let empleadoFinal = empleado_id; // ←  Siempre usar el nuevo seleccionado, no mantener el anterior

                if (row) {
                    clienteFinal = row.cliente;
                    metodoFinal = row.metodo_pago;
                }


                db.get(`SELECT 1 FROM carrito WHERE producto_id = ? AND cliente = ?`, [producto, clienteFinal], (err, existe) => {
                    if (err) {
                        console.error('Error al verificar duplicados:', err);
                        return res.status(500).json({ error: "Error al verificar duplicados" });
                    }

                    if (existe) {
                        return res.status(400).json({ error: "Este producto ya está en el carrito" });
                    }

                    // Insertamos con el precio del producto
                    db.run(`INSERT INTO carrito (producto_id, metodo_pago, cliente, producto_precio_carrito, empleado_id) VALUES (?, ?, ?, ?, ?)`,
                        [producto, metodoFinal, clienteFinal, productoData.precio, empleadoFinal],
                        err => {
                            if (err) {
                                console.error('Error al guardar en carrito:', err);
                                return res.status(500).json({ error: "Error al guardar en carrito" });
                            }
                            res.json({ success: true });
                        }
                    );
                });
            });
        });
    });
});


router.post('/EliminarPedido/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM carrito WHERE id = ?`, [id], err => {
        if (err) return res.status(500).send("Error al eliminar pedido");
        res.redirect('/Agregar');
    });
});

// Ruta para obtener datos del pedido a editar (para el modal)
router.get('/ViewPedidoEdit/:id', (req, res) => {
    const { id } = req.params;

    db.get(`
    SELECT c.id, p.id AS producto_id, p.nombre AS producto, 
           c.producto_precio_carrito AS precio
    FROM carrito c
    JOIN productos p ON c.producto_id = p.id
    WHERE c.id = ?
  `, [id], (err, pedido) => {
        if (err) return res.status(500).json({ error: "Error al obtener pedido" });
        if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });

        res.json(pedido);
    });
});

// Ruta para procesar la edición (se mantiene igual)
router.post('/EditarPedido/:id', (req, res) => {
    const { id } = req.params;
    const { producto, precio } = req.body; // Solo recibimos producto y precio

    if (!producto) {
        return res.status(400).json({ error: "Debe seleccionar un producto" });
    }

    if (!precio || isNaN(precio)) {
        return res.status(400).json({ error: "Precio inválido" });
    }

    // Obtenemos el cliente y método de pago actual del pedido
    db.get(
        `SELECT cliente FROM carrito WHERE id = ?`,
        [id],
        (err, pedidoActual) => {
            if (err) return res.status(500).json({ error: "Error al obtener pedido actual" });

            // Verificamos duplicados usando el cliente actual (no el editado)
            db.get(
                `SELECT 1 FROM carrito WHERE producto_id = ? AND cliente = ? AND id != ?`,
                [producto, pedidoActual.cliente, id],
                (err, existe) => {
                    if (err) return res.status(500).json({ error: "Error al verificar duplicados" });

                    if (existe) {
                        return res.status(400).json({ error: "Este producto ya está en el carrito" });
                    }

                    // Actualizamos solo producto y precio
                    db.run(
                        `UPDATE carrito SET producto_id = ?, producto_precio_carrito = ? WHERE id = ?`,
                        [producto, parseFloat(precio), id],
                        (err) => {
                            if (err) return res.status(500).json({ error: "Error al actualizar pedido" });
                            res.json({ success: true });
                        }
                    );
                }
            );
        }
    );
});

// POST /EnviarPedidoFinal
router.post('/EnviarPedidoFinal', (req, res) => {
    // 1. Verificación de usuario logueado
    if (!req.session.username) {
        return res.status(401).json({ error: "No autorizado. Por favor, inicie sesión." });
    }
    const usuarioActual = req.session.name;

    const fechaLocal = getLocalDateTimeWithAMPM();

    // Leemos el carrito con producto (nombre, precio) y cliente (nombre)
    // ⚠️ IMPORTANTE: Cambiar para usar producto_precio_carrito en lugar de precio original
    const sqlCarrito = `
    SELECT 
    c.id AS carrito_id, 
    p.nombre AS producto, 
    c.producto_precio_carrito AS precio, 
    c.metodo_pago, 
    cli.nombre AS cliente_nombre,
    cli.apellido AS cliente_apellido,
    e.name AS empleado_nombre, 
    e.id AS empleado_id
    FROM carrito c
    JOIN productos p ON c.producto_id = p.id
    JOIN clientes cli ON c.cliente = cli.id
    LEFT JOIN employees e ON c.empleado_id = e.id
    `;

    db.serialize(() => {
        db.all(sqlCarrito, (err, filas) => {
            if (err) {
                console.error("Error leyendo carrito:", err);
                return res.status(500).json({ error: "Error al leer carrito" });
            }

            if (!filas || filas.length === 0) {
                return res.status(400).json({ error: "No hay productos en el carrito" });
            }

            // Calcula total y toma cliente/metodo del primer elemento
            const metodoPago = filas[0].metodo_pago || '';
            const nombreCliente = `${filas[0].cliente_nombre || ''} ${filas[0].cliente_apellido || ''}`.trim();

            const totalPedido = filas.reduce((sum, r) => sum + (Number(r.precio) || 0), 0);

            // Inicio de transacción
            db.run('BEGIN TRANSACTION', (errBegin) => {
                if (errBegin) {
                    console.error("BEGIN ERROR:", errBegin);
                    return res.status(500).json({ error: "Error iniciando transacción" });
                }

                // Insertar en tabla pedidos
                const insertPedidoSQL = `
                    INSERT INTO pedidos (metodo_pago, nombre_cliente, fecha_pedido, total_pedido, nota, usuario, estado)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                db.run(insertPedidoSQL, [metodoPago, nombreCliente, fechaLocal.formatted, totalPedido, '', usuarioActual, 'Pagado'], function (errInsert) {
                    if (errInsert) {
                        console.error("Error insertando pedido:", errInsert);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: "Error al guardar el pedido" });
                    }

                    const pedidoId = this.lastID;

                    // Preparar inserción en pedidosDetalles
                    const stmt = db.prepare(`INSERT INTO pedidosDetalles (pedido_id, producto_nombre, producto_precio, employees_name) VALUES (?, ?, ?, ?)`);

                    // Insertar cada producto
                    for (const row of filas) {
                        stmt.run(pedidoId, row.producto, row.precio, row.empleado_nombre || 'Sin asignar');
                    }

                    stmt.finalize((errFinalize) => {
                        if (errFinalize) {
                            console.error("Error finalizando stmt detalles:", errFinalize);
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: "Error al guardar detalles del pedido" });
                        }

                        // Vaciar carrito
                        db.run(`DELETE FROM carrito`, (errDelete) => {
                            if (errDelete) {
                                console.error("Error eliminando carrito:", errDelete);
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: "Error al limpiar el carrito" });
                            }

                            // Confirmar transacción
                            db.run('COMMIT', (errCommit) => {
                                if (errCommit) {
                                    console.error("Error en COMMIT:", errCommit);
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: "Error finalizando la transacción" });
                                }

                                // Todo OK: devolver JSON de éxito
                                return res.json({
                                    success: true,
                                    message: "Pedido enviado correctamente",
                                    pedidoId: pedidoId
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;