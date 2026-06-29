const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middlewares/auth.js');
const db = require('../models/db.js'); // Asegúrate de que esta ruta sea correcta
const bcrypt = require('bcryptjs');

// ============================================
// MIDDLEWARE DE VALIDACIÓN
// ============================================

// Validar datos de registro
const validateSignup = (req, res, next) => {
    const { name, username, password } = req.body;
    const errors = [];

    if (!name || name.trim().length < 2) {
        errors.push('El nombre debe tener al menos 2 caracteres');
    }
    if (!username || username.trim().length < 3) {
        errors.push('El usuario debe tener al menos 3 caracteres');
    }
    if (!password || password.length < 6) {
        errors.push('La contraseña debe tener al menos 6 caracteres');
    }
    
    // Validar caracteres permitidos en username (solo letras, números y guiones)
    if (username && !/^[a-zA-Z0-9_-]+$/.test(username)) {
        errors.push('El usuario solo puede contener letras, números, guiones y guiones bajos');
    }

    if (errors.length > 0) {
        return res.status(400).render('signup', { 
            errors, 
            name, 
            username 
        });
    }

    next();
};

// Validar datos de login
const validateLogin = (req, res, next) => {
    const { username, password } = req.body;
    const errors = [];

    if (!username || !password) {
        errors.push('Usuario y contraseña son requeridos');
    }

    if (errors.length > 0) {
        return res.status(400).render('login', { errors, username });
    }

    next();
};

// Rate limiting simple (prevenir fuerza bruta)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

const rateLimitLogin = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    
    if (loginAttempts.has(ip)) {
        const attempts = loginAttempts.get(ip);
        
        // Limpiar intentos antiguos
        const recentAttempts = attempts.filter(time => now - time < LOCKOUT_TIME);
        
        if (recentAttempts.length >= MAX_ATTEMPTS) {
            const timeLeft = Math.ceil((LOCKOUT_TIME - (now - recentAttempts[0])) / 60000);
            return res.status(429).render('login', {
                errors: [`Demasiados intentos fallidos. Intenta de nuevo en ${timeLeft} minutos.`]
            });
        }
        
        loginAttempts.set(ip, recentAttempts);
    }
    
    next();
};

// Registrar intento fallido
const recordFailedLogin = (ip) => {
    const attempts = loginAttempts.get(ip) || [];
    attempts.push(Date.now());
    loginAttempts.set(ip, attempts);
};

// Limpiar intentos exitosos
const clearLoginAttempts = (ip) => {
    loginAttempts.delete(ip);
};

// ============================================
// RUTAS
// ============================================

// Ruta para mostrar la vista de registro
router.get('/signup', (req, res) => {
      // Si ya está logueado, redirigir al dashboard
    if (req.session.userId) {
        return res.redirect('/');
    }
    res.render('signup', { errors: [], name: '', username: '' });
});

// Ruta para manejar el envío del formulario de registro
router.post('/signup', validateSignup, async (req, res) => {
    const { name, username, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Consulta modificada para incluir el campo 'name'
        const sql = `INSERT INTO users (name, username, password, is_admin, is_active) 
        VALUES (?, ?, ?, 0, 0)`;

        db.run(sql, [name.trim(), username.trim().toLowerCase(), hashedPassword], function(err) {
            if (err) {
             console.error('Error al registrar usuario:', err.message);
                
                if (err.message.includes("UNIQUE constraint failed")) {
                    return res.status(400).render('signup', {
                        errors: ['El nombre de usuario ya existe. Por favor, elige otro.'],
                        name,
                        username
                    });
                }
                
                return res.status(500).render('signup', {
                    errors: ['Error al registrar el usuario. Intenta de nuevo.'],
                    name,
                    username
                });
            }
            // Registro exitoso - redirigir con mensaje
            req.session.successMessage = '¡Registro exitoso! Ahora puedes iniciar sesión.';
            // Mensaje informando que debe esperar activación
            req.session.pendingActivation = true;


            res.redirect('/login');
        });
    } catch (error) {
        console.error('Error del servidor en signup:', error);
        res.status(500).render('signup', {
            errors: ['Error del servidor. Por favor, intenta más tarde.'],
            name,
            username
        });
    }
});

// Ruta para mostrar la vista de login
router.get('/login', (req, res) => {
    // Si ya está logueado, redirigir al dashboard
    if (req.session.userId) {
        return res.redirect('/');
    }
    
    const successMessage = req.session.successMessage;
    delete req.session.successMessage; // Limpiar mensaje
    
    res.render('login', { 
        errors: [], 
        username: '',
        successMessage 
    });
});

// Ruta para manejar el envío del formulario de login
router.post('/login', validateLogin, rateLimitLogin, (req, res) => {
const { username, password } = req.body;
    const ip = req.ip;
    
    const sql = `SELECT * FROM users WHERE LOWER(username) = LOWER(?)`;
    
    db.get(sql, [username.trim()], async (err, user) => {
        if (err) {
            console.error('Error al buscar usuario:', err.message);
            return res.status(500).render('login', {
                errors: ['Error del servidor. Por favor, intenta más tarde.'],
                username
            });
        }
        
        if (!user) {
            recordFailedLogin(ip);
            return res.status(401).render('login', {
                errors: ['Usuario o contraseña incorrectos.'],
                username
            });
        }
        
        try {
            const passwordMatch = await bcrypt.compare(password, user.password);
            
             if (!passwordMatch) {
                recordFailedLogin(ip);
                return res.status(401).render('login', {
                    errors: ['Usuario o contraseña incorrectos.'],
                    username
                });
            }
            
            // ✅ VERIFICAR SI ESTÁ ACTIVO
            if (!user.is_active) {
                return res.status(403).render('login', {
                    errors: [],
                    username,
                    warningMessage: 'Tu cuenta está pendiente de activación. El administrador debe aprobar tu acceso.'
                });
            }
                // Limpiar intentos fallidos
                clearLoginAttempts(ip);
                
                // Regenerar session ID para prevenir session fixation
                req.session.regenerate((err) => {
                    if (err) {
                        console.error('Error al regenerar sesión:', err);
                        return res.status(500).render('login', {
                            errors: ['Error al iniciar sesión. Intenta de nuevo.'],
                            username
                        });
                    }
                    
                    // Guardar información del usuario en la sesión
                    req.session.userId = user.id;
                    req.session.username = user.username;
                    req.session.name = user.name;
                    req.session.is_admin = user.is_admin;
                    
                    // Actualizar último login (opcional)
                    db.run(`UPDATE users SET last_login = datetime('now', 'localtime') WHERE id = ?`, [user.id], (updateErr) => {
                        if (updateErr) {
                            console.error('Error al actualizar last_login:', updateErr);
                        } else {
                            console.log('✅ Last login actualizado para usuario ID:', user.id);
                        }
                    });

                    res.redirect('/');
                });

        } catch (error) {
            console.error('Error al comparar contraseñas:', error);
            res.status(500).render('login', {
                errors: ['Error del servidor. Por favor, intenta más tarde.'],
                username
            });
        }
    });
});

// Ruta para cerrar la sesión
router.get('/logout', (req, res) => {
  if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).send('Error al cerrar la sesión.');
        }
        res.clearCookie('connect.sid'); // Limpiar cookie de sesión
        res.redirect('/login');
    });
});

router.get('/admin/usuarios-pendientes', requireAuth, requireAdmin, (req, res) => {
    const sql = `SELECT id, name, username, created_at 
                 FROM users 
                 WHERE is_active = 0 
                 ORDER BY created_at DESC`;
    
    db.all(sql, [], (err, users) => {
        if (err) {
            console.error('Error al obtener usuarios pendientes:', err);
            return res.status(500).send('Error del servidor');
        }
        
        res.render('admin/usuarios-pendientes', { users });
    });
});

router.post('/api/usuarios/actualizar-estado', requireAuth, requireAdmin, (req, res) => {
    const { userId, isActive } = req.body;
    
    if (!userId || (isActive !== 0 && isActive !== 1)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Datos inválidos.' 
        });
    }
    
    const sql = `UPDATE users SET is_active = ? WHERE id = ?`;
    
    db.run(sql, [isActive, userId], function(err) {
        if (err) {
            console.error('Error al actualizar estado:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al actualizar el usuario.' 
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado.' 
            });
        }
        
        res.json({ 
            success: true, 
            message: isActive ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.' 
        });
    });
});

// Ruta para actualizar permisos de admin (requiere ser admin)
router.post('/api/usuarios/actualizar-admin', requireAuth, requireAdmin, (req, res) => {
       // Verificar que el usuario esté autenticado y sea admin
    if (!req.session.userId || !req.session.is_admin) {
        return res.status(403).json({ 
            success: false, 
            message: 'No tienes permisos para realizar esta acción.' 
        });
    }
    
    const { userId, newIsAdminStatus } = req.body;
    
    // Validar datos
    if (!userId || (newIsAdminStatus !== 0 && newIsAdminStatus !== 1)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Datos inválidos.' 
        });
    }
    
        // Verificar que el usuario esté activo
    db.get(`SELECT is_active FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado.' 
            });
        }
        
        if (!user.is_active) {
            return res.status(400).json({ 
                success: false, 
                message: 'No puedes hacer admin a un usuario inactivo.' 
            });
        }
        

         // Prevenir que el usuario se quite sus propios permisos de admin
         if (req.session.userId == userId && newIsAdminStatus === 0) {
             return res.status(400).json({ 
                 success: false, 
                 message: 'No puedes quitarte tus propios permisos de administrador.' 
             });
         }
     
         const sql = `UPDATE users SET is_admin = ? WHERE id = ?`;

         db.run(sql, [newIsAdminStatus, userId], function(err) {
             if (err) {
                 console.error('Error al actualizar usuario:', err);
                 return res.status(500).json({ 
                     success: false, 
                     message: 'Error al actualizar el usuario.' 
                 });
             }

             if (this.changes === 0) {
                 return res.status(404).json({ 
                     success: false, 
                     message: 'Usuario no encontrado.' 
                 });
             }
         
             // Si el usuario que se actualizó es el que está logueado
             if (req.session.userId == userId) {
                 req.session.is_admin = newIsAdminStatus;
             }
         
             res.json({ 
                 success: true, 
                 message: 'Usuario actualizado correctamente.' 
             });
         });
    })
});

module.exports = router;