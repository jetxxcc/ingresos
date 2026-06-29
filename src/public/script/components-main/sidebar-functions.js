
        // Tu código existente del sidebar y tema se mantiene igual...
        const toggleButton = document.getElementById('toggle-btn');
        const sidebar = document.getElementById('sidebar');

        function toggleSidebar() {
            sidebar.classList.toggle('close');
            toggleButton.classList.toggle('rotate');
            closeAllSubMenus();
        }

        function toggleSubMenu(button) {
            if (!button.nextElementSibling.classList.contains('show')) {
                closeAllSubMenus();
            }
            button.nextElementSibling.classList.toggle('show');
            button.classList.toggle('rotate');

            if (sidebar.classList.contains('close')) {
                sidebar.classList.toggle('close');
                toggleButton.classList.toggle('rotate');
            }
        }

        function closeAllSubMenus() {
            Array.from(sidebar.getElementsByClassName('show')).forEach(ul => {
                ul.classList.remove('show');
                ul.previousElementSibling.classList.remove('rotate');
            });
        }


        // Script para manejar el estado activo del sidebar 
 
        // Marcar elemento activo basado en la página actual
        document.addEventListener('DOMContentLoaded', function() {
            const currentPage = '<%= activePage %>';
            if (currentPage) {
                // Agregar clase active al elemento correspondiente
                const activeElement = document.querySelector(`a[href="${currentPage}"]`);
                if (activeElement) {
                    activeElement.parentElement.classList.add('active');
                }
            }
        });
   
