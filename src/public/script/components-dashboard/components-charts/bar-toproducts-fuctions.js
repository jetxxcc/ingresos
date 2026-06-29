document.addEventListener('DOMContentLoaded', () => {

        if (document.getElementById('topProductosChart') && chartData.topProductos) {
        const ctxProductos = document.getElementById('topProductosChart').getContext('2d');
        new Chart(ctxProductos, {
            type: 'bar',
            data: {
                labels: chartData.topProductos.labels,
                datasets: [{
                    label: 'Cantidad Vendida',
                    data: chartData.topProductos.data,
                    backgroundColor: 'rgba(153, 102, 255, 0.7)',
                }]
            },
            options: {
                maintainAspectRatio: false,
                indexAxis: 'y', // <-- Esto hace el gráfico horizontal
                responsive: true,
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Top 10 Productos Más Vendidos',
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
                    }
                }
            }
        });
    }

})