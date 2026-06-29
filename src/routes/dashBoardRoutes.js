const express = require('express');
const router = express.Router();
const db = require('../models/db.js');

const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};
// sqlite3 funciona de manera asíncrona
// Función auxiliar para ejecutar consultas con Promises (más limpio que callbacks)
function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                return reject(err);
            }
            resolve(rows);
        });
    });
}

router.get('/', requireAuth, async (req, res) => {
    try {

                // --- 1. Preparar los últimos 7 días con valores en 0 ---
        // Usar la fecha y hora actual directamente del sistema
        const hoy = new Date();

        const diasSemanaLabels = [];
        const ingresosPorDia = new Map();
        const cantidadPorDia = new Map();

         // Formateador para obtener el nombre del día en español
        const formateadorDia = new Intl.DateTimeFormat('es-DO', { 
            weekday: 'long' ,
            timeZone: 'America/Santo_Domingo'
        });

        // Generar los últimos 7 días (incluyendo hoy)
        for (let i = 6; i >= 0; i--) {
            const fecha = new Date(hoy);
            fecha.setDate(hoy.getDate() - i);
            const fechaISO = fecha.toISOString().split('T')[0]; // Formato YYYY-MM-DD
            
    
            // Crear una fecha específica para el formateador (mediodía para evitar problemas de zona horaria)
             const fechaParaFormato = new Date(fechaISO + 'T12:00:00Z');
            const nombreDia = formateadorDia.format(fechaParaFormato);
            const nombreDiaCapitalizado = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
            
            diasSemanaLabels.push(nombreDiaCapitalizado);
            ingresosPorDia.set(fechaISO, 0); // Inicializar con 0
            cantidadPorDia.set(fechaISO, 0)
        }

        // --- 2. Consultar ingresos reales de la base de datos ---
        const ingresosDB = await runQuery(`
            SELECT 
                DATE(SUBSTR(fecha_pedido, 1, 10)) AS dia,
                SUM(total_pedido) AS total,
                COUNT(DISTINCT id) AS cantidad
            FROM pedidos
            WHERE 
                DATE(SUBSTR(fecha_pedido, 1, 10)) >= DATE('now', '-6 days', 'localtime')
            GROUP BY DATE(SUBSTR(fecha_pedido, 1, 10))
            ORDER BY dia ASC
        `);

        // --- 3. Llenar el Map con los datos reales ---
        if (ingresosDB) {
            ingresosDB.forEach(row => {
                ingresosPorDia.set(row.dia, row.total);
                cantidadPorDia.set(row.dia, row.cantidad);
            });
        }

       
        // --- Ejecutamos todas las consultas en paralelo para mayor eficiencia ---
        const [
            metodosPago,
            topProductos,
            ventasEmpleado,
            estadosPedidos,
            topClientes
        ] = await Promise.all([
            runQuery(`
                SELECT metodo_pago, COUNT(*) as conteo
                FROM pedidos
                GROUP BY metodo_pago
            `),
            runQuery(`
                SELECT producto_nombre, COUNT(*) as cantidad
                FROM pedidosDetalles
                GROUP BY producto_nombre
                ORDER BY cantidad DESC
                LIMIT 10
            `),
            runQuery(`
                SELECT 
                    TRIM(UPPER(employees_name)) as employee, 
                    COUNT(*) as cantidad_pedidos,
                    SUM(producto_precio) as total_vendido
                FROM pedidosDetalles
                WHERE employees_name IS NOT NULL AND employees_name != ''
                GROUP BY employee
                ORDER BY total_vendido DESC
            `),
            runQuery(`
                SELECT 
                    UPPER(TRIM(estado)) as estado, 
                    COUNT(*) as conteo
                FROM pedidos
                WHERE estado IS NOT NULL AND estado != ''
                GROUP BY UPPER(TRIM(estado))
                ORDER BY conteo DESC
            
            `),
            runQuery(`
                SELECT nombre_cliente, COUNT(*) as cantidad
                    FROM pedidos
                    GROUP BY nombre_cliente
                    ORDER BY cantidad DESC
                    LIMIT 10
            
            `)
        ]);

        // --- Empaquetamos los datos, asegurando que no sean nulos ---
        const chartData = {
         ingresosDiarios: {
                labels: diasSemanaLabels,
                data: Array.from(ingresosPorDia.values()),
                dataCantidad: Array.from(cantidadPorDia.values())
            },
            metodosPago: {
                labels: (metodosPago || []).map(item => item.metodo_pago),
                data: (metodosPago || []).map(item => item.conteo)
            },
            topProductos: {
                labels: (topProductos || []).map(item => item.producto_nombre),
                data: (topProductos || []).map(item => item.cantidad)
            },
            ventasEmpleado: {
               labels: (ventasEmpleado || []).map(item => item.employee),
                dataPorCantidad: (ventasEmpleado || []).map(item => item.cantidad_pedidos),
                dataPorTotal: (ventasEmpleado || []).map(item => item.total_vendido)
            },
            estadosPedidos: {
                labels: (estadosPedidos || []).map(item => item.estado),
                data: (estadosPedidos || []).map(item => item.conteo)
            },
            topClientes: {
                labels: (topClientes || []).map(item => item.nombre_cliente),
                data: (topClientes || []).map(item => item.cantidad)
            }

        };
       console.log("📅 Fecha HOY en RD:", hoy.toISOString().split('T')[0]);
        console.log("📊 Ingresos DB:", ingresosDB);
        console.log("🗓️ Labels generados:", diasSemanaLabels);
        console.log("💰 Map de ingresos:", Array.from(ingresosPorDia.entries()));

        res.render('index', {
            title: 'Dashboard',
            activePage: '/',
            is_admin: req.session.is_admin || false,
            template: 'dashboard',
            chartData: chartData
        });

    } catch (error) {
        console.error("Error al obtener datos para el dashboard:", error);
        res.status(500).send("Error al cargar el dashboard. Revisa la consola del servidor.");
    }
});


router.get('/api/ingresos-diarios', requireAuth, async (req, res) => {
    try {
        const filtro = req.query.filtro || '1semana';
        
        const hoy = new Date();
        let diasLabels = [];
        let ingresosPorPeriodo = new Map();
        let cantidadPorPeriodo = new Map();
        
        // ==================== 1 SEMANA ====================
        if (filtro === '1semana') {
            const formateadorDia = new Intl.DateTimeFormat('es-DO', { weekday: 'long' });
            
            for (let i = 6; i >= 0; i--) {
                const fecha = new Date(hoy);
                fecha.setDate(hoy.getDate() - i);
                const fechaISO = fecha.toISOString().split('T')[0];
                
                const nombreDia = formateadorDia.format(fecha);
                const nombreDiaCapitalizado = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
                
                diasLabels.push(nombreDiaCapitalizado);
                ingresosPorPeriodo.set(fechaISO, 0);
                cantidadPorPeriodo.set(fechaISO, 0);
            }
            
            const ingresosDB = await runQuery(`
                SELECT 
                    SUBSTR(fecha_pedido, 1, 10) AS dia,
                    SUM(total_pedido) AS total,
                    COUNT(DISTINCT id) AS cantidad
                FROM pedidos
                WHERE DATE(SUBSTR(fecha_pedido, 1, 10)) >= DATE('now', '-6 days')
                GROUP BY SUBSTR(fecha_pedido, 1, 10)
            `);
            
            if (ingresosDB) {
                ingresosDB.forEach(row => {
                    ingresosPorPeriodo.set(row.dia, row.total);
                    cantidadPorPeriodo.set(row.dia, row.cantidad);
                });
            }
        }
        
        // ==================== 2 SEMANAS ====================
        else if (filtro === '2semanas') {
            const formateadorDia = new Intl.DateTimeFormat('es-DO', { weekday: 'long' });
            
            for (let i = 13; i >= 0; i--) {
                const fecha = new Date(hoy);
                fecha.setDate(hoy.getDate() - i);
                const fechaISO = fecha.toISOString().split('T')[0];
                
                const nombreDia = formateadorDia.format(fecha);
                const nombreDiaCapitalizado = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
                
                // Si es de la semana pasada (días 13-7)
                const label = i >= 7 ? `${nombreDiaCapitalizado} pasado` : nombreDiaCapitalizado;
                
                diasLabels.push(label);
                ingresosPorPeriodo.set(fechaISO, 0);
                cantidadPorPeriodo.set(fechaISO, 0);
            }
            
            const ingresosDB = await runQuery(`
                SELECT 
                    SUBSTR(fecha_pedido, 1, 10) AS dia,
                    SUM(total_pedido) AS total,
                    COUNT(DISTINCT id) AS cantidad
                FROM pedidos
                WHERE DATE(SUBSTR(fecha_pedido, 1, 10)) >= DATE('now', '-13 days')
                GROUP BY SUBSTR(fecha_pedido, 1, 10)
            `);
            
            if (ingresosDB) {
                ingresosDB.forEach(row => {
                    ingresosPorPeriodo.set(row.dia, row.total);
                    cantidadPorPeriodo.set(row.dia, row.cantidad);
                });
            }
        }
        
        // ==================== 1 MES (4 semanas) ====================
        else if (filtro === '1mes') {
            for (let semana = 4; semana >= 1; semana--) {
                diasLabels.push(`Semana ${semana}`);
                ingresosPorPeriodo.set(`semana${semana}`, 0);
                cantidadPorPeriodo.set(`semana${semana}`, 0);
            }
            
            const ingresosDB = await runQuery(`
                SELECT 
                    SUBSTR(fecha_pedido, 1, 10) AS dia,
                    SUM(total_pedido) AS total,
                    COUNT(DISTINCT id) AS cantidad
                FROM pedidos
                WHERE DATE(SUBSTR(fecha_pedido, 1, 10)) >= DATE('now', '-29 days')
                GROUP BY SUBSTR(fecha_pedido, 1, 10)
            `);
            
            if (ingresosDB) {
                ingresosDB.forEach(row => {
                    const fecha = new Date(row.dia);
                    const diasDiff = Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24));
                    const numSemana = Math.floor(diasDiff / 7) + 1;
                    const key = `semana${numSemana}`;
                    
                    if (numSemana <= 4) {
                        ingresosPorPeriodo.set(key, (ingresosPorPeriodo.get(key) || 0) + row.total);
                        cantidadPorPeriodo.set(key, (cantidadPorPeriodo.get(key) || 0) + row.cantidad);
                    }
                });
            }
        }
        
        // ==================== 3 MESES (12 semanas agrupadas por mes) ====================
        else if (filtro === '3meses') {
            const mesesAtras = [2, 1, 0]; // 3 meses atrás, 2 meses atrás, mes actual
            
            mesesAtras.forEach(mesOffset => {
                const fechaMes = new Date(hoy);
                fechaMes.setMonth(hoy.getMonth() - mesOffset);
                const nombreMes = fechaMes.toLocaleDateString('es-DO', { month: 'long' });
                const nombreMesCapitalizado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
                
                for (let semana = 1; semana <= 4; semana++) {
                    const label = `${nombreMesCapitalizado} - Semana ${semana}`;
                    diasLabels.push(label);
                    ingresosPorPeriodo.set(`mes${mesOffset}_semana${semana}`, 0);
                    cantidadPorPeriodo.set(`mes${mesOffset}_semana${semana}`, 0);
                }
            });
            
            const ingresosDB = await runQuery(`
                SELECT 
                    SUBSTR(fecha_pedido, 1, 10) AS dia,
                    SUM(total_pedido) AS total,
                    COUNT(DISTINCT id) AS cantidad
                FROM pedidos
                WHERE DATE(SUBSTR(fecha_pedido, 1, 10)) >= DATE('now', '-89 days')
                GROUP BY SUBSTR(fecha_pedido, 1, 10)
            `);
            
            if (ingresosDB) {
                ingresosDB.forEach(row => {
                    const fecha = new Date(row.dia);
                    const mesOffset = (hoy.getFullYear() - fecha.getFullYear()) * 12 + (hoy.getMonth() - fecha.getMonth());
                    
                    if (mesOffset <= 2) {
                        const primerDiaMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
                        const diasDesdePrimerDia = Math.floor((fecha - primerDiaMes) / (1000 * 60 * 60 * 24));
                        const numSemana = Math.floor(diasDesdePrimerDia / 7) + 1;
                        const key = `mes${mesOffset}_semana${Math.min(numSemana, 4)}`;
                        
                        ingresosPorPeriodo.set(key, (ingresosPorPeriodo.get(key) || 0) + row.total);
                        cantidadPorPeriodo.set(key, (cantidadPorPeriodo.get(key) || 0) + row.cantidad);
                    }
                });
            }
        }
        
        // ==================== 6 MESES, 1 AÑO, 2 AÑOS, TODO ====================
        else {
            let whereClause = '';
            let mesesAtras = 0;
            
            if (filtro === '6meses') {
                mesesAtras = 6;
                whereClause = "WHERE DATE(SUBSTR(fecha_pedido, 1, 10)) >= DATE('now', '-179 days')";
            } else if (filtro === '1año') {
                mesesAtras = 12;
                whereClause = "WHERE DATE(SUBSTR(fecha_pedido, 1, 10)) >= DATE('now', '-364 days')";
            } else if (filtro === '2años') {
                mesesAtras = 24;
                whereClause = "WHERE DATE(SUBSTR(fecha_pedido, 1, 10)) >= DATE('now', '-729 days')";
            }
            
            const ingresosDB = await runQuery(`
                SELECT 
                    SUBSTR(fecha_pedido, 1, 7) AS mes,
                    SUM(total_pedido) AS total,
                    COUNT(DISTINCT id) AS cantidad
                FROM pedidos
                ${whereClause}
                GROUP BY SUBSTR(fecha_pedido, 1, 7)
                ORDER BY mes ASC
            `);
            
            if (ingresosDB && ingresosDB.length > 0) {
                const mesesPorAnio = new Map();
                
                ingresosDB.forEach(row => {
                    const [anio, mes] = row.mes.split('-');
                    const fecha = new Date(parseInt(anio), parseInt(mes) - 1);
                    const nombreMes = fecha.toLocaleDateString('es-DO', { month: 'long' });
                    const nombreMesCapitalizado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
                    
                    if (!mesesPorAnio.has(anio)) {
                        mesesPorAnio.set(anio, []);
                    }
                    
                    mesesPorAnio.get(anio).push({
                        mes: nombreMesCapitalizado,
                        key: row.mes,
                        total: row.total,
                        cantidad: row.cantidad
                    });
                });
                
                // Ordenar años de más antiguo a más reciente
                const aniosOrdenados = Array.from(mesesPorAnio.keys()).sort();
                
                aniosOrdenados.forEach(anio => {
                    const meses = mesesPorAnio.get(anio);
                    meses.forEach(mesData => {
                        diasLabels.push(`${mesData.mes} ${anio}`);
                        ingresosPorPeriodo.set(mesData.key, mesData.total);
                        cantidadPorPeriodo.set(mesData.key, mesData.cantidad);
                    });
                });
            }
        }
        
        res.json({
            labels: diasLabels,
            data: Array.from(ingresosPorPeriodo.values()),
            dataCantidad: Array.from(cantidadPorPeriodo.values())
        });
        
    } catch (error) {
        console.error("Error al obtener ingresos diarios:", error);
        res.status(500).json({ error: "Error al cargar datos" });
    }
});


router.get('/api/ventas-empleado', async (req, res) => {
try {
        const filtro = req.query.filtro || '1semana';
        
        let whereClause = 'WHERE pd.employees_name IS NOT NULL AND pd.employees_name != ""';
        
        if (filtro !== 'todo') {
            const dias = {
                '1semana': 7,
                '2semanas': 14,
                '1mes': 30,
                '3meses': 90,
                '6meses': 180,
                '1año': 365,
                '2años': 730
            };
            
            const diasAtras = dias[filtro];
            
            const hoy = new Date();
            hoy.setHours(hoy.getHours() - 4);
            
            const fechaInicio = new Date(hoy);
            fechaInicio.setDate(hoy.getDate() - diasAtras);
            const fechaInicioISO = fechaInicio.toISOString().split('T')[0];
            const fechaFinISO = hoy.toISOString().split('T')[0];
            
            whereClause += ` AND DATE(substr(p.fecha_pedido, 1, 10)) BETWEEN '${fechaInicioISO}' AND '${fechaFinISO}'`;
        }
        
        const ventasEmpleado = await runQuery(`
            SELECT 
                TRIM(UPPER(pd.employees_name)) as employee, 
                COUNT(*) as cantidad_pedidos,
                SUM(pd.producto_precio) as total_vendido
            FROM pedidosDetalles pd
            INNER JOIN pedidos p ON pd.pedido_id = p.id
            ${whereClause}
            GROUP BY employee
            ORDER BY total_vendido DESC
        `);
        
        res.json({
            labels: (ventasEmpleado || []).map(item => item.employee),
            dataPorCantidad: (ventasEmpleado || []).map(item => item.cantidad_pedidos),
            dataPorTotal: (ventasEmpleado || []).map(item => item.total_vendido)
        });
        
    } catch (error) {
        console.error("Error al obtener ventas por empleado:", error);
        res.status(500).json({ error: "Error al cargar datos" });
    }
});

module.exports = router;