        // Sistema de tema
        let darkMode = localStorage.getItem('dark');
        const themeSwitch = document.getElementById('theme-switch');

        const enableDarkMode = () => {
            document.body.classList.add('dark');
            localStorage.setItem('dark', 'active');
        }

        const disableDarkMode = () => {
            document.body.classList.remove('dark');
            localStorage.setItem('dark', null);
        }

        if (darkMode === "active") enableDarkMode();

        themeSwitch.addEventListener("click", () => {
            darkMode = localStorage.getItem('dark');
            darkMode !== "active" ? enableDarkMode() : disableDarkMode();
        });