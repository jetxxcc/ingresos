// VARIABLES GLOBALES
const mainWindow = document.getElementById('main-window');
const extraWindows = document.getElementById('extra-windows');

// Función para animar el contenido
function animateContent(container, delay = 0) {
    if (!container) return;
    const contentElements = container.querySelectorAll('.content-example');
    contentElements.forEach((element, index) => {
        setTimeout(() => {
            element.classList.add('animate-in');
        }, delay + (index * 100));
    });
}

// Función para resetear animaciones de contenido
function resetContentAnimation(container) {
    if (!container) return;
    const contentElements = container.querySelectorAll('.content-example');
    contentElements.forEach(element => {
        element.classList.remove('animate-in');
    });
}

// Detectar si estamos en una página con ventana doble
function hasDoubleWindow() {
    return extraWindows && extraWindows.children.length > 0;
}

// Inicializar en modo correcto según la página
document.addEventListener('DOMContentLoaded', () => {
    if (hasDoubleWindow()) {
        // Si hay ventanas dobles, mostrarlas
        showExtraWindows();
    } else if (mainWindow) {
        // Si solo hay ventana principal, mostrarla
        showMainWindow();
    }
});

// Función para mostrar la ventana principal
function showMainWindow() {
    if (!mainWindow) return;
    
    if (extraWindows && extraWindows.classList.contains('show')) {
        extraWindows.classList.remove('show');
        resetContentAnimation(extraWindows);
        
        setTimeout(() => {
            mainWindow.classList.remove('hidden', 'slide-out-left');
            resetContentAnimation(mainWindow);
            
            setTimeout(() => {
                animateContent(mainWindow, 400);
            }, 200);
        }, 400);
    } else {
        mainWindow.classList.remove('hidden', 'slide-out-left');
        resetContentAnimation(mainWindow);
        setTimeout(() => {
            animateContent(mainWindow, 100);
        }, 50);
    }
}

// Función para mostrar las ventanas adicionales
function showExtraWindows() {
    if (!extraWindows || !mainWindow) return;
    
    mainWindow.classList.add('slide-out-left');
    resetContentAnimation(mainWindow);
    
    setTimeout(() => {
        mainWindow.classList.add('hidden');
        mainWindow.classList.remove('slide-out-left');
        
        extraWindows.classList.add('show');
        resetContentAnimation(extraWindows);
        
        setTimeout(() => {
            animateContent(extraWindows, 400);
        }, 200);
        
    }, 400);
}