document.addEventListener('DOMContentLoaded', () => {
// --- Gráfico Donut de Estados de Pedidos ---
if (document.getElementById('estadosPedidosChart') && chartData.estadosPedidos) {
    const ctxEstados = document.getElementById('estadosPedidosChart').getContext('2d');
    
    // Definir colores según el estado
    const estadoColores = {
        'PAGADO': 'rgba(34, 197, 94, 0.8)',      // Verde
        'PENDIENTE': 'rgba(239, 68, 68, 0.8)',   // Rojo
        'CANCELADO': 'rgba(107, 114, 128, 0.8)', // Gris
        'EN PROCESO': 'rgba(59, 130, 246, 0.8)'  // Azul
    };


    const colores = (chartData.estadosPedidos.labels || []).map(label => 
        estadoColores[label] || 'rgba(156, 163, 175, 0.8)'
    );

    new Chart(ctxEstados, {
        type: 'doughnut',
        data: {
            labels: chartData.estadosPedidos.labels,
            datasets: [{
                data: chartData.estadosPedidos.data,
                backgroundColor: colores,
                borderColor: '#1f2937',
                borderWidth: 2
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Estados de Pedidos',
                    color: '#fff',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#fff',
                        font: { size: 12 },
                        padding: 15
                    }
                },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 12 },
                    formatter: (value, context) => {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const porcentaje = ((value / total) * 100).toFixed(1);
                        return `${porcentaje}%`;
                    }
                }
            }
        }
    });
}


});