  // Validación en tiempo real de la contraseña
        const passwordInput = document.getElementById('password');
        const strengthBar = document.getElementById('passwordStrengthBar');
        const strengthText = document.getElementById('passwordStrengthText');
        const strengthContainer = document.getElementById('passwordStrength');
        const reqLength = document.getElementById('req-length');

        passwordInput.addEventListener('input', function () {
            const password = this.value;
            const length = password.length;

            if (length > 0) {
                strengthContainer.style.display = 'block';
                strengthText.style.display = 'block';
            } else {
                strengthContainer.style.display = 'none';
                strengthText.style.display = 'none';
            }

            // Calcular fortaleza
            let strength = 0;
            if (length >= 6) {
                strength = 1;
                reqLength.classList.add('requirement-met');
                reqLength.innerHTML = '<i class="fas fa-check"></i> Mínimo 6 caracteres';
            } else {
                reqLength.classList.remove('requirement-met');
                reqLength.innerHTML = 'Mínimo 6 caracteres';
            }

            if (length >= 8) strength = 2;
            if (length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) strength = 3;

            // Actualizar barra
            const colors = ['#e53e3e', '#dd6b20', '#ecc94b', '#38a169'];
            const widths = ['25%', '50%', '75%', '100%'];
            const texts = ['Débil', 'Regular', 'Buena', 'Fuerte'];

            if (strength > 0) {
                strengthBar.style.width = widths[strength - 1];
                strengthBar.style.backgroundColor = colors[strength - 1];
                strengthText.textContent = texts[strength - 1];
                strengthText.style.color = colors[strength - 1];
            }
        });

        // Validación del formulario
        document.getElementById('signupForm').addEventListener('submit', function (e) {
            const username = document.getElementById('username').value;
            const pattern = /^[a-zA-Z0-9_-]+$/;

            if (!pattern.test(username)) {
                e.preventDefault();
                alert('El nombre de usuario solo puede contener letras, números, guiones y guiones bajos');
            }
        });