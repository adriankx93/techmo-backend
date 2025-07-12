const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Brak tokenu autoryzacji' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Użytkownik nie istnieje' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Konto nieaktywne' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Nieprawidłowy token' });
  }
};

const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user.permissions[resource] || !req.user.permissions[resource][action]) {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }
    next();
  };
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Wymagane uprawnienia administratora' });
  }
  next();
};

const isManagerOrAdmin = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Wymagane uprawnienia managera lub administratora' });
  }
  next();
};

module.exports = {
  auth,
  checkPermission,
  isAdmin,
  isManagerOrAdmin
};