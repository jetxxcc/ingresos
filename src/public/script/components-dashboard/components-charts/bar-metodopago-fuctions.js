document.addEventListener('DOMContentLoaded', () => {
    
     if (document.getElementById('metodosPagoChart') && chartData.metodosPago) {
        const ctxMetodos = document.getElementById('metodosPagoChart').getContext('2d');
        new Chart(ctxMetodos, {
            type: 'bar',
            data: {
                labels: chartData.metodosPago.labels,
                datasets: [{
                    label: 'Métodos de Pago',
                    data: chartData.metodosPago.data,
                    backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)'],
                    hoverOffset: 4
                }]
            },
            options: {
                maintainAspectRatio: false,
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Métodos de Pago mas usados',
                        color: '#fff',
                        font: { size: 16, weight: 'bold' } 
                    },
                    legend: { display: false }
                },
                scales: {
                    y: {
                        ticks: {
                            color: '#fff',
                            font: { size: 16 }
                        }
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#fff',
                        font: { size: 12 },
                        padding: 15
                    }
                }
            }
        });
    }

})