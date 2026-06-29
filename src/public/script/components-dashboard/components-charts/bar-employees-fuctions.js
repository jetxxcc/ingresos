document.addEventListener('DOMContentLoaded', () => {

// --- 4. Gráfico de Ventas por Empleado (Barras Verticales) ---
    if (document.getElementById('ventasEmpleadoChart') && chartData.ventasEmpleado) {
        const ctxEmpleados = document.getElementById('ventasEmpleadoChart').getContext('2d');
        const toggleSwitch = document.getElementById('toggleMetricaEmpleado');
        const filtroSelect = document.getElementById('filtroTiempoEmpleado');
           // --- Funciones para formatear las etiquetas (texto sobre las barras) ---
        const formatoCantidad = (value) => `${value} pedidos`;
    const formatoMoneda = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

    // Estado del filtro
    let filtroActual = 'todo';
    let datosActuales = chartData.ventasEmpleado;
        
        let ventasEmpleadoChart = new Chart(ctxEmpleados, {
        type: 'bar',
        data: {
            labels: datosActuales.labels,
            datasets: [{
                // Empezamos mostrando la CANTIDAD de pedidos
                label: 'Cantidad de Pedidos',
                data: datosActuales.dataPorCantidad,
                backgroundColor: 'rgba(255, 159, 64, 0.7)',
            }]
        },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                 scales: {
                    y: {
                         ticks: {
                        font: { size: 16 }
                         },
                        type: 'linear',
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Empleado que mas esta vendiendo',
                        color: '#fff',
                        font: { size: 16, weight: 'bold' }
                     },
                    legend: { display: false },
                    datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#fff',
                    font: { weight: 'bold' },
                    formatter: formatoCantidad // Empezamos con el formato de cantidad
                    }
                }
            }
        });

          // Función para cargar datos filtrados
    const cargarDatosFiltrados = (tipo) => {
        ventasEmpleadoChart.data.labels = ['Cargando...'];
        ventasEmpleadoChart.data.datasets[0].data = [0];
        ventasEmpleadoChart.update();

        fetch(`/api/ventas-empleado?filtro=${tipo}`)
            .then(res => res.json())
            .then(data => {
                datosActuales = data;
                ventasEmpleadoChart.data.labels = data.labels;
                
                // Mostrar datos según el estado del toggle
                if (toggleSwitch && toggleSwitch.checked) {
                    ventasEmpleadoChart.data.datasets[0].data = data.dataPorTotal;
                } else {
                    ventasEmpleadoChart.data.datasets[0].data = data.dataPorCantidad;
                }
                
                ventasEmpleadoChart.update();
            })
            .catch(err => {
                console.error('Error al filtrar:', err);
                alert('Error al cargar los datos');
            });
    };

    // IMPORTANTE: Cargar datos de 1 semana al iniciar
    cargarDatosFiltrados('1semana');

    // --- Event listener para el select ---
    filtroSelect.addEventListener('change', function() {
        filtroActual = this.value;
        cargarDatosFiltrados(filtroActual);
    });

        // --- Lógica para escuchar los cambios en el interruptor ---
        toggleSwitch?.addEventListener('change', function() {
            const isChecked = this.checked;
            
            // Si está activado, mostramos el TOTAL VENDIDO
            if (isChecked) {
                ventasEmpleadoChart.data.datasets[0].label = 'Total Vendido ($)';
                ventasEmpleadoChart.data.datasets[0].data = datosActuales.dataPorTotal;
                ventasEmpleadoChart.options.plugins.datalabels.formatter = formatoMoneda;
                
            } 
            // Si está desactivado, mostramos la CANTIDAD DE PEDIDOS
            else {
                ventasEmpleadoChart.data.datasets[0].label = 'Cantidad de Pedidos';
                ventasEmpleadoChart.data.datasets[0].data = datosActuales.dataPorCantidad;
                ventasEmpleadoChart.options.plugins.datalabels.formatter = formatoCantidad;
                
            }
            
            // ¡Muy importante! Actualizamos el gráfico para que muestre los cambios
        ventasEmpleadoChart.update();
        });
    }

    });