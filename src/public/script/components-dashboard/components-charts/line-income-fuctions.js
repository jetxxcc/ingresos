// public/js/dashboard-charts.js

// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

    // Configuración global para que el texto de los gráficos sea blanco
    Chart.defaults.color = '#fff';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.2)';

    // --- 1. Gráfico de Ingresos por Día (Líneas) ---
    if (document.getElementById('ingresosChart') && chartData.ingresosDiarios) {
        const ctxIngresos = document.getElementById('ingresosChart').getContext('2d');
        const toggleMetricaIngresos = document.getElementById('toggleMetricaIngresos');
        const rangoFechaSelect = document.getElementById('rangoFechaSelect');

         // Datos actuales (se actualizarán con el filtro si es necesario)
        let datosActuales = chartData.ingresosDiarios;
        let filtroActual = '1semana';

        const ingresosChart = new Chart(ctxIngresos, {
            type: 'line',
            data: {
                labels: datosActuales.labels,
                datasets: [{
                    label: 'Cantidad de Pedidos',
                    data: datosActuales.dataCantidad, // Por defecto cantidad
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                maintainAspectRatio: false, //Al hacer esto, le dices a Chart.js que se olvide de su proporción y se estire para llenar completamente el contenedor que le has asignado.
                responsive: true,
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Últimos 7 Dias',
                        color: '#fff',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#fff',
                            font: { size: 16 }
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

                    // Función para cargar datos filtrados
                    const cargarDatosFiltrados = (filtro) => {
                        ingresosChart.data.labels = ['Cargando...'];
                        ingresosChart.data.datasets[0].data = [0];
                        ingresosChart.update();
                    
                        fetch(`/api/ingresos-diarios?filtro=${filtro}`)
                            .then(res => res.json())
                            .then(data => {
                                datosActuales = data;
                                ingresosChart.data.labels = data.labels;

                                // Mostrar datos según el estado del toggle
                                // Comprueba si existe Y si está marcado
                                if (toggleMetricaIngresos && toggleMetricaIngresos.checked) {
                                    ingresosChart.data.datasets[0].data = data.data; // Ingresos
                                } else {
                                    ingresosChart.data.datasets[0].data = data.dataCantidad; // Cantidad
                                }

                                // Actualizar título según el filtro
                                const titulos = {
                                    '1semana': 'Últimos 7 Días',
                                    '2semanas': 'Últimas 2 Semanas',
                                    '1mes': 'Último Mes',
                                    '3meses': 'Últimos 3 Meses',
                                    '6meses': 'Últimos 6 Meses',
                                    '1año': 'Último Año',
                                    '2años': 'Últimos 2 Años',
                                    'todo': 'Todo el Tiempo'
                                };
                                ingresosChart.options.plugins.title.text = titulos[filtro] || 'Ingresos';

                                ingresosChart.update();
                            })
                            .catch(err => {
                                console.error('Error al filtrar ingresos:', err);
                                alert('Error al cargar los datos');
                            });
                    };
                
                    // Cargar datos de 1 semana al inicio
                    cargarDatosFiltrados('1semana');
                
                    // Event listener para el filtro de fecha
                    rangoFechaSelect.addEventListener('change', function() {
                        filtroActual = this.value;
                        cargarDatosFiltrados(filtroActual);
                    });

         // Event listener para el switch
         //encadenamiento opcional
         //El ?. le dice a JavaScript: "Solo intenta agregar este 'listener' si toggleMetricaIngresos no es nulo". 
         // Para los no-admins, simplemente ignorará este bloque y el código continuará sin romperse.
        toggleMetricaIngresos?.addEventListener('change', function() {
            const isChecked = this.checked;

            if (isChecked) {
                // Mostrar INGRESOS ($)
                ingresosChart.data.datasets[0].label = 'Ingresos del Día ($)';
                ingresosChart.data.datasets[0].data = datosActuales.data; // Ingresos
                ingresosChart.data.datasets[0].backgroundColor = 'rgba(59, 130, 246, 0.2)';
                ingresosChart.data.datasets[0].borderColor = 'rgba(59, 130, 246, 1)';
            } else {
                // Mostrar CANTIDAD de pedidos
                ingresosChart.data.datasets[0].label = 'Cantidad de Pedidos';
                ingresosChart.data.datasets[0].data = datosActuales.dataCantidad
                ingresosChart.data.datasets[0].backgroundColor = 'rgba(75, 192, 192, 0.2)';
                ingresosChart.data.datasets[0].borderColor = 'rgba(75, 192, 192, 1)';
            }

            ingresosChart.update();
        });
    }


   
   
    

    
});