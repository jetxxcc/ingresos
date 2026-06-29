  document.addEventListener('DOMContentLoaded', () => {
            // --- Referencias a los elementos del DOM ---
            const container1 = document.getElementById('container-1');
            const container2 = document.getElementById('container-2');
            const content1 = document.getElementById('content-1');
            const content2 = document.getElementById('content-2');
            const toggleBtn = document.getElementById('toggle-btn-dashboard');
    
            // --- SVGs para los iconos de las flechas ---
            const arrowUpSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-600"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
            const arrowDownSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-600"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
            
            // --- Estado inicial de la aplicación ---
            let activeContainer = 'container-1';
    
            // --- Función principal para actualizar la UI ---
            function updateUI() {
                // Lógica para el Contenedor 1 (Arriba)
                if (activeContainer === 'container-1') {
                    // Estado: Abierto
                    container1.classList.remove('h-5');
                    container1.classList.add('flex-1');
                    content1.classList.remove('opacity-0', 'pointer-events-none');
                    
                    // Posicionar el botón único
                    toggleBtn.style.top = ''; 
                    toggleBtn.style.bottom = '-2rem'; // 4rem = h-16
                    toggleBtn.innerHTML = arrowUpSVG;
    
                } else {
                    // Estado: Cerrado
                    container1.classList.remove('flex-1');
                    container1.classList.add('h-5');
                    content1.classList.add('opacity-0', 'pointer-events-none');
                }
    
                // Lógica para el Contenedor 2 (Abajo)
                if (activeContainer === 'container-2') {
                    // Estado: Abierto
                    container2.classList.remove('h-5');
                    container2.classList.add('flex-1');
                    content2.classList.remove('opacity-0', 'pointer-events-none');
                    
                    // Posicionar el botón único
                    toggleBtn.style.bottom = '';
                    toggleBtn.style.top = '0.5rem'; // 4rem = h-16
                    toggleBtn.innerHTML = arrowDownSVG;
    
                } else {
                    // Estado: Cerrado
                    container2.classList.remove('flex-1');
                    container2.classList.add('h-5');
                    content2.classList.add('opacity-0', 'pointer-events-none');
                }
            }
    
            // --- Event Listener para el botón único ---
            toggleBtn.addEventListener('click', () => {
                activeContainer = (activeContainer === 'container-1') ? 'container-2' : 'container-1';
                updateUI();
            });
    
            // --- Inicializa la UI con el estado por defecto ---
            updateUI();
        });