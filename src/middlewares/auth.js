// middlewares/auth.js

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }
    next();
};

// Middleware para verificar que sea admin
const requireAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    if (!req.session.is_admin) {
        return res.status(403).render('error', {
            message: 'Acceso denegado',
            description: 'No tienes permisos para acceder a esta página.'
        });
    }
    next();
};

// Middleware para prevenir acceso a login/signup si ya está autenticado
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return res.redirect('/');
    }
    next();
};

module.exports = {
    requireAuth,
    requireAdmin,
    redirectIfAuthenticated
};