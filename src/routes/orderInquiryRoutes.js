const express = require('express');
const router = express.Router();
const db = require('../models/db.js');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs'); 

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}; 






// Ruta para consultar pedidos
router.get('/consultar-pedidos', requireAuth, (req, res) => {
    const { fechaInicio, fechaFin, metodoPago, estado, tieneNota, pedidoId, buscar, page = 1, limit = 20 } = req.query;
    const currentPage = parseInt(page);
    const itemsPerPage = parseInt(limit);
    const offset = (currentPage - 1) * itemsPerPage;

    let sqlPedidos = `
        SELECT
            id AS pedido_id,
            fecha_pedido,
            metodo_pago,
            nombre_cliente,
            total_pedido,
            nota,
            usuario,
            estado
        FROM
            pedidos
    `;

    let sqlCount = `SELECT COUNT(*) as total FROM pedidos`;
    let sqlTotal = `SELECT SUM(total_pedido) AS total_filtrado FROM pedidos`;

    const params = [];
    const countParams = [];
    const totalParams = [];
    const conditions = [];

        // BÚSQUEDA UNIVERSAL - busca en múltiples campos
    if (buscar && buscar.trim() !== '') {
        const searchTerm = `%${buscar}%`;
        conditions.push(`(
            id LIKE ? OR 
            fecha_pedido LIKE ? OR 
            metodo_pago LIKE ? OR 
            nombre_cliente LIKE ? OR 
            total_pedido LIKE ? OR 
            nota LIKE ? OR 
            usuario LIKE ? OR 
            estado LIKE ?
        )`);
        
        // Agregar el término de búsqueda para cada campo
        for (let i = 0; i < 8; i++) {
            params.push(searchTerm);
            countParams.push(searchTerm);
            totalParams.push(searchTerm);
        }
    }

    // Filtro por pedidoId
    if (pedidoId) {
        const pedidoIdNum = parseInt(pedidoId);
        if (!isNaN(pedidoIdNum)) {
            conditions.push(`id = ?`);
            params.push(pedidoIdNum);
            countParams.push(pedidoIdNum);
            totalParams.push(pedidoIdNum);
        }
    }

    // Filtro por fecha inicio
    if (fechaInicio) {
        conditions.push(`fecha_pedido >= ?`);
        params.push(fechaInicio);
        countParams.push(fechaInicio);
        totalParams.push(fechaInicio);
    }

    // Filtro por fecha fin
    if (fechaFin) {
        conditions.push(`fecha_pedido < date(?, '+1 day')`);
        params.push(fechaFin);
        countParams.push(fechaFin);
        totalParams.push(fechaFin);
    }

    // Filtro por método de pago
    if (metodoPago && metodoPago !== 'todos') {
        conditions.push(`metodo_pago = ?`);
        params.push(metodoPago);
        countParams.push(metodoPago);
        totalParams.push(metodoPago);
    }

     // Filtro por estado
    if (estado && estado !== 'todos') {
        conditions.push(`LOWER(estado) = LOWER(?)`);
        params.push(estado);
        countParams.push(estado);
        totalParams.push(estado);
    }

    // Filtro por nota
    if (tieneNota && tieneNota !== 'todos') {
        if (tieneNota === 'conNota') {
            conditions.push(`nota IS NOT NULL AND nota != ''`);
        } else if (tieneNota === 'sinNota') {
            conditions.push(`(nota IS NULL OR nota = '')`);
        }
        // No agregar params porque no son placeholders
    }

    let whereClause = '';
    if (conditions.length > 0) {
        whereClause = ` WHERE ` + conditions.join(' AND ');
    }

    sqlPedidos += whereClause;
    sqlCount += whereClause;
    sqlTotal += whereClause;
    sqlPedidos += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(itemsPerPage, offset);



    // Ejecutar consultas
    db.all(sqlPedidos, params, (err, rowsPedidos) => {
        if (err) {
            console.error('Error al obtener los pedidos:', err);
            return res.status(500).send("Error obteniendo pedidos");
        }

        db.get(sqlCount, countParams, (err, countResult) => {
            if (err) {
                console.error('Error al obtener el conteo:', err);
                return res.status(500).send("Error obteniendo conteo");
            }

            db.get(sqlTotal, totalParams, (err, rowTotal) => {
                if (err) {
                    console.error('Error al obtener el total:', err);
                    return res.status(500).send("Error obteniendo el total");
                }

                const totalPedidos = countResult ? countResult.total : 0;
                const totalFiltrado = rowTotal ? rowTotal.total_filtrado : null;
                const totalPages = Math.ceil(totalPedidos / itemsPerPage);
                const isAdmin = req.session.is_admin || false;
                
                // DETECTAR SI HAY FILTROS ACTIVOS Y NO HAY RESULTADOS
                 const hayFiltrosActivos = fechaInicio || fechaFin || 
                    (metodoPago && metodoPago !== 'todos') || 
                    (estado && estado !== 'todos') || 
                    (tieneNota && tieneNota !== 'todos') || 
                    pedidoId || 
                    (buscar && buscar.trim() !== '');

                const showNoResultsModal = hayFiltrosActivos && totalPedidos === 0;

                // Obtener métodos de pago únicos, para ver lista en el combobox
                db.all(`SELECT DISTINCT metodo_pago FROM pedidos WHERE metodo_pago IS NOT NULL ORDER BY metodo_pago`, (err, metodosPago) => {
                    if (err) {
                        console.error('Error obteniendo métodos de pago:', err);
                        metodosPago = [];
                    }

                    res.render('index', {
                        title: 'Consultar Pedidos',
                        activePage: '/consultar-pedidos',
                        is_admin: isAdmin,
                        template: 'consultar-pedidos',
                        pedidos: rowsPedidos || [],
                        totalFiltrado: totalFiltrado || 0,
                        fechaInicio: fechaInicio || '',
                        fechaFin: fechaFin || '',
                        metodoPago: metodoPago || 'todos',
                        metodosPago: metodosPago || [],
                        estado: estado || 'todos',
                        tieneNota: tieneNota || 'todos',
                        pedidoId: pedidoId || '',
                        buscar: buscar || '',
                        currentPage: currentPage,
                        totalPages: totalPages,
                        totalPedidos: totalPedidos,
                        limit: itemsPerPage,
                        showNoResultsModal: showNoResultsModal
                    });
                });
            });
        });
    });
});


router.get('/api/pedidos/detalles/:id', (req, res) => {
    const { id } = req.params;

    // MODIFICACIÓN: Agregamos la columna 'id' a la consulta SELECT
    const sql = `
        SELECT id, producto_nombre, producto_precio, employees_name
        FROM pedidosDetalles
        WHERE pedido_id = ?;
    `;

    db.all(sql, [id], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error al obtener los detalles del pedido." });
        }
        res.json(rows);
    });
});

router.post('/api/pedidos/editar/detalle', (req, res) => {
    const { id, nombre, precio, empleado } = req.body; // <-- La variable 'empleado' ya está aquí

    db.get(`SELECT pedido_id FROM pedidosDetalles WHERE id = ?`, [id], (err, row) => {
        if (err || !row) {
            console.error('Error al obtener el pedido_id:', err);
            return res.status(404).json({ success: false, message: "Detalle de pedido no encontrado." });
        }
        const pedidoId = row.pedido_id;

        db.run('BEGIN TRANSACTION', err => {
            if (err) {
                console.error('Error al iniciar la transacción:', err);
                return res.status(500).json({ success: false, message: "Error al iniciar la transacción." });
            }

            db.run(`UPDATE pedidosDetalles SET producto_nombre = ?, producto_precio = ?, employees_name = ? WHERE id = ?`,
                [nombre, precio, empleado, id], function (err) { // <-- USAR la variable 'empleado' aquí
                    if (err) {
                        console.error('Error en la primera UPDATE:', err);
                        db.run('ROLLBACK');
                        return res.status(500).json({ success: false, message: "Error al actualizar el detalle del producto." });
                    }

                    const sqlUpdateTotal = `
                    UPDATE pedidos
                    SET total_pedido = (SELECT SUM(producto_precio) FROM pedidosDetalles WHERE pedido_id = ?)
                    WHERE id = ?;
                `;
                    db.run(sqlUpdateTotal, [pedidoId, pedidoId], function (err) {
                        if (err) {
                            console.error('Error en la segunda UPDATE (recalcular total):', err);
                            db.run('ROLLBACK');
                            return res.status(500).json({ success: false, message: "Error al recalcular el total del pedido." });
                        }

                        db.run('COMMIT', err => {
                            if (err) {
                                console.error('Error al confirmar la transacción:', err);
                                return res.status(500).json({ success: false, message: "Error al confirmar la transacción." });
                            }
                            res.json({ success: true, message: `Detalle y total del pedido ${pedidoId} actualizados.` });
                        });
                    });
                });
        });
    });
});


router.post('/api/pedidos/editar/nota', (req, res) => {
    // Obtiene el id y la nueva nota del cuerpo de la petición
    const { id, nota } = req.body;

    // Consulta SQL para actualizar la nota
    // db.run() es mejor para sentencias que no devuelven datos (UPDATE, INSERT, DELETE)
    const sql = `
        UPDATE pedidos
        SET nota = ?
        WHERE id = ?;
    `;

    db.run(sql, [nota, id], function (err) {
        if (err) {
            console.error(err.message);
            // Si hay un error, devuelve un mensaje de error
            return res.status(500).json({ success: false, message: "Error al actualizar la nota." });
        }
        // Si todo sale bien, devuelve un mensaje de éxito
        res.json({ success: true, message: `Nota actualizada para el pedido ${id}.` });
    });
});

router.post('/api/pedidos/editar/datos', (req, res) => {
    // Obtiene los datos del cuerpo de la petición JSON
    const { id, fecha, metodo_pago, cliente } = req.body;

    // Consulta SQL para actualizar la fecha, metodo_pago y cliente
    const sql = `
        UPDATE pedidos
        SET fecha_pedido = ?, metodo_pago = ?, nombre_cliente = ?
        WHERE id = ?;
    `;

    // db.run() es ideal para UPDATE, DELETE, etc.
    db.run(sql, [fecha, metodo_pago, cliente, id], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: "Error al actualizar el pedido." });
        }

        if (this.changes > 0) {
            // this.changes indica cuántas filas fueron afectadas
            res.json({ success: true, message: `Pedido ${id} actualizado correctamente.` });
        } else {
            // Esto podría ocurrir si el ID no existe
            res.status(404).json({ success: false, message: "Pedido no encontrado o sin cambios." });
        }
    });
});

// En tu archivo de rutas, por ejemplo, mainRoutes.js

router.post('/api/pedidos/eliminar', (req, res) => {
    const { pedidoId } = req.body;

    // Verificación básica del ID
    if (!pedidoId) {
        return res.status(400).json({ success: false, message: "ID de pedido no proporcionado." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Eliminar primero los detalles del pedido
        const sqlDeleteDetalles = `DELETE FROM pedidosDetalles WHERE pedido_id = ?`;
        db.run(sqlDeleteDetalles, [pedidoId], function (errDetalles) {
            if (errDetalles) {
                console.error("Error al eliminar detalles:", errDetalles.message);
                db.run('ROLLBACK');
                return res.status(500).json({ success: false, message: "Error al eliminar detalles del pedido." });
            }

            // Luego, eliminar el pedido principal
            const sqlDeletePedido = `DELETE FROM pedidos WHERE id = ?`;
            db.run(sqlDeletePedido, [pedidoId], function (errPedido) {
                if (errPedido) {
                    console.error("Error al eliminar pedido:", errPedido.message);
                    db.run('ROLLBACK');
                    return res.status(500).json({ success: false, message: "Error al eliminar el pedido." });
                }

                db.run('COMMIT', (errCommit) => {
                    if (errCommit) {
                        console.error("Error en COMMIT:", errCommit.message);
                        db.run('ROLLBACK');
                        return res.status(500).json({ success: false, message: "Error finalizando la transacción." });
                    }
                    console.log(`Pedido ${pedidoId} y sus detalles eliminados correctamente.`);
                    res.json({ success: true, message: "Pedido eliminado." });
                });
            });
        });
    });
});

// Función para convertir una imagen a Base64
const imageToBase64 = (filePath) => {
    const file = fs.readFileSync(filePath);
    return `data:image/${path.extname(filePath).substring(1)};base64,${file.toString('base64')}`;
};

// Nueva ruta para descargar el pedido
router.get('/descargar/pedido/:id', async (req, res) => {
    const pedidoId = req.params.id;

    try {
        // Promisify de las llamadas a la base de datos
        const getAsync = (sql, params) => {
            return new Promise((resolve, reject) => {
                db.get(sql, params, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
        };

        const allAsync = (sql, params) => {
            return new Promise((resolve, reject) => {
                db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        };

        // 1. Obtener datos del pedido
        const sqlPedido = `SELECT * FROM pedidos WHERE id = ?;`;
        const pedido = await getAsync(sqlPedido, [pedidoId]);


        if (!pedido) {
            return res.status(404).send("Pedido no encontrado.");
        }

        // 2. Obtener detalles del pedido
        const sqlDetalles = `SELECT producto_nombre, producto_precio FROM pedidosDetalles WHERE pedido_id = ?;`;
        const detalles = await allAsync(sqlDetalles, [pedidoId]);

        // 3. Convertir las imágenes a Base64
        const headerLogoBase64 = imageToBase64(path.join(__dirname, '../public/img/oie_transparent(11).png'));
        const mainLogoBase64 = imageToBase64(path.join(__dirname, '../public/img/ShaloLogo.png'));
        const footerWaveBase64 = imageToBase64(path.join(__dirname, '../public/img/wave-footer.png'));

        // 4. Renderizar la plantilla EJS con las imágenes Base64
        const htmlContent = await new Promise((resolve, reject) => {
            res.render('../public/facturaTemplate', {
                pedido,
                detalles,
                headerLogoBase64,
                mainLogoBase64,
                footerWaveBase64
            }, (err, html) => {
                if (err) reject(err);
                else resolve(html);
            });
        });

        // 5. Generar el PDF con Puppeteer
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });
        const page = await browser.newPage();

        // No necesitamos `baseURL` aquí, ya que los recursos están incrustados
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });

        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();

        // 6. Enviar el PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Factura: No.0${pedido.id} - de ${pedido.nombre_cliente} - ${pedido.fecha_pedido}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("Error al generar el PDF:", error);
        res.status(500).send("Error interno del servidor.");
    }
});

router.post('/api/pedidos/cambiar/estado', (req, res) => {
    const { id, estado } = req.body;

    // Consulta SQL para actualizar el estado del pedido
    const sql = `
        UPDATE pedidos
        SET estado = ?
        WHERE id = ?;
    `;

    db.run(sql, [estado, id], function (err) {
        if (err) {
            console.error('Error al actualizar el estado:', err.message);
            return res.status(500).json({ success: false, message: "Error al actualizar el estado." });
        }

        if (this.changes > 0) {
            res.json({ success: true, message: `Estado del pedido ${id} actualizado a ${estado}.` });
        } else {
            res.status(404).json({ success: false, message: "Pedido no encontrado o estado sin cambios." });
        }
    });
});


module.exports = router;
