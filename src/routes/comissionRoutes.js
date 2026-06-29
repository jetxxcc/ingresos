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

// Ruta para comisiones
router.get('/comisiones', requireAuth, (req, res) => {
    const { fechaInicio, fechaFin, metodoPago, empleado, pedidoId, buscar, page = 1, limit = 20 } = req.query;
    const currentPage = parseInt(page);
    const itemsPerPage = parseInt(limit);
    const offset = (currentPage - 1) * itemsPerPage;

    let sqlComisiones = `
        SELECT 
            pd.*,
            p.fecha_pedido,
            p.metodo_pago,
            p.nombre_cliente,
            p.usuario as vendedor
        FROM pedidosDetalles pd
        LEFT JOIN pedidos p ON pd.pedido_id = p.id
    `;

    let sqlCount = `
        SELECT COUNT(*) as total 
        FROM pedidosDetalles pd
        LEFT JOIN pedidos p ON pd.pedido_id = p.id
    `;

    let sqlTotal = `
        SELECT SUM(pd.producto_precio) as total_comisiones 
        FROM pedidosDetalles pd
        LEFT JOIN pedidos p ON pd.pedido_id = p.id
    `;
    
    const params = [];
    const countParams = [];
    const totalParams = [];
    const conditions = [];

    // buscador para campos
        if (buscar && buscar.trim() !== '') {
        const searchTerm = `%${buscar}%`;
        conditions.push(`(
            pd.pedido_id LIKE ? OR 
            pd.producto_nombre LIKE ? OR 
            pd.producto_precio LIKE ? OR 
            pd.employees_name LIKE ? OR 
            p.fecha_pedido LIKE ? OR 
            p.metodo_pago LIKE ? OR 
            p.nombre_cliente LIKE ? OR 
            p.usuario LIKE ?
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
            conditions.push(`pd.pedido_id = ?`);
            params.push(pedidoIdNum);
            countParams.push(pedidoIdNum);
            totalParams.push(pedidoIdNum);
        }
    }
    
    // Filtro por fecha
    if (fechaInicio) {
        conditions.push(`p.fecha_pedido >= ?`);
        params.push(fechaInicio);
        countParams.push(fechaInicio);
        totalParams.push(fechaInicio);
    }
    
    if (fechaFin) {
        conditions.push(`p.fecha_pedido < date(?, '+1 day')`);
        params.push(fechaFin);
        countParams.push(fechaFin);
        totalParams.push(fechaFin);
    }

        // Filtro por método de pago
    if (metodoPago && metodoPago !== 'todos') {
        conditions.push(`p.metodo_pago = ?`);
        params.push(metodoPago);
        countParams.push(metodoPago);
        totalParams.push(metodoPago);
    }
    
    // Filtro por empleado
    if (empleado && empleado !== 'todos') {
        conditions.push(`pd.employees_name = ?`);
        params.push(empleado);
        countParams.push(empleado);
        totalParams.push(empleado);
    }

    let whereClause = ''; 
    if (conditions.length > 0) {
        whereClause = ` WHERE ` + conditions.join(' AND ');
    }
    
    sqlComisiones += whereClause;
    sqlCount += whereClause;
    sqlTotal += whereClause;
    sqlComisiones += ` ORDER BY  pd.pedido_id DESC LIMIT ? OFFSET ?`;
    params.push(itemsPerPage, offset);

    // Obtener empleados únicos
    db.all(`SELECT DISTINCT employees_name FROM pedidosDetalles WHERE employees_name IS NOT NULL ORDER BY employees_name`, 
        (err, empleados) => {
            if (err) {
                console.error('Error obteniendo empleados:', err);
                empleados = [];
            }

            db.get(sqlCount, countParams, (err, countResult) => {
                if (err) {
                    console.error('Error al obtener el conteo:', err);
                    return res.status(500).send("Error obteniendo conteo");
                }

                db.get(sqlTotal, totalParams, (err, totalResult) => {
                    if (err) {
                        console.error('Error al obtener el total:', err);
                        return res.status(500).send("Error obteniendo total");
                    }

                    db.all(sqlComisiones, params, (err, comisiones) => {
                        if (err) {
                            console.error('Error al obtener comisiones:', err);
                            return res.status(500).send("Error obteniendo comisiones");
                        }

                        const totalComisiones = countResult ? countResult.total : 0;
                        const totalMonto = totalResult ? totalResult.total_comisiones : 0;
                        const totalPages = Math.ceil(totalComisiones / itemsPerPage);
						
						// DETECTAR SI HAY FILTROS ACTIVOS Y NO HAY RESULTADOS
						const hayFiltrosActivos = fechaInicio || fechaFin || 
							(metodoPago && metodoPago !== 'todos') || 
							(empleado && empleado !== 'todos') || 
							pedidoId || 
							(buscar && buscar.trim() !== '');
		
						const showNoResultsModalComision = hayFiltrosActivos && totalComisiones === 0;
		
                        db.all(`SELECT DISTINCT metodo_pago FROM pedidos WHERE metodo_pago IS NOT NULL ORDER BY metodo_pago`, (err, metodosPago) => {
                        if (err) {
                            console.error('Error obteniendo métodos de pago:', err);
                            metodosPago = [];
                        }
                        res.render('index', {
                            title: 'Comisiones',
                            activePage: '/comisiones',
                            is_admin: req.session.is_admin || false,
                            template: 'comisiones',
                            comisiones: comisiones || [],
                            totalMonto: totalMonto,
                            totalComisiones: totalComisiones,
                            fechaInicio: fechaInicio || '',
                            fechaFin: fechaFin || '',
                            metodoPago: metodoPago || 'todos',
                            metodosPago: metodosPago || [],
                            empleado: empleado || 'todos',
                            empleados: empleados || [],
                            pedidoId: pedidoId || '',
                            buscar: buscar || '',
                            currentPage: currentPage,
                            totalPages: totalPages,
                            limit: itemsPerPage,
							showNoResultsModalComision: showNoResultsModalComision
                        });
                    });
                    });
                });
            });
        });
});


// routes/mainRoutes.js
router.get('/pedido/:id', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const pedidoId = req.params.id;

    // Consulta para obtener los detalles del pedido específico
    const sqlPedido = `
        SELECT 
            p.*,
            GROUP_CONCAT(pd.producto_nombre || ' - $' || pd.producto_precio, ', ') as productos
        FROM pedidos p
        LEFT JOIN pedidosDetalles pd ON p.id = pd.pedido_id
        WHERE p.id = ?
        GROUP BY p.id
    `;

    // Consulta para obtener todos los items del pedido
    const sqlItems = `
        SELECT *
        FROM pedidosDetalles
        WHERE pedido_id = ?
        ORDER BY id
    `;

    db.get(sqlPedido, [pedidoId], (err, pedido) => {
        if (err) {
            console.error('Error al obtener el pedido:', err);
            return res.status(500).send("Error obteniendo pedido");
        }

        if (!pedido) {
            return res.status(404).send("Pedido no encontrado");
        }

        db.all(sqlItems, [pedidoId], (err, items) => {
            if (err) {
                console.error('Error al obtener items del pedido:', err);
                return res.status(500).send("Error obteniendo items del pedido");
            }

            res.render('viewPedidos', {
                pedido: pedido,
                items: items || [],
                is_admin: req.session.is_admin || false
            });
        });
    });
});

module.exports = router;