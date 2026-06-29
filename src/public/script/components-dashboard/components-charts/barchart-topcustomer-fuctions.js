document.addEventListener('DOMContentLoaded', () => {

   
    if (document.getElementById('topClientesChart') && chartData.topClientes) {
        const ctxClientes = document.getElementById('topClientesChart').getContext('2d');
        new Chart(ctxClientes, {
            type: 'bar',
            data: {
                labels: chartData.topClientes.labels,
                datasets: [{
                    label: ' A visitado',
                    data: chartData.topClientes.data,
                    backgroundColor: 'rgba(102, 150, 255, 0.7)',
                }]
            },
            options: {
                maintainAspectRatio: false,
                indexAxis: 'x', 
                responsive: true,
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Top 10 Clientes que mas visitan',
                        color: '#fff',
                        font: { size: 16, weight: 'bold' } 
                    },
                    legend: { display: false }
                },
                scales: {
                    x: { // Ahora X es el eje de los números
                        ticks: {
                            color: '#fff',
                            font: { size: 18 }
                        }
                    },
                    y: { // Ahora Y es el eje de los nombres de clientes
                        ticks: {
                            color: '#fff',
                            font: {
                                size: 16, // <-- Tamaño de los nombres
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }



});