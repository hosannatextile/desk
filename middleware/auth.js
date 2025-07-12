const jwt = require('jsonwebtoken');
require('dotenv').config();

const ACCESS_TOKEN_SECRET = 'a9f83b7f1d6e4c8a9e6f2c3b0d1f7a3e4b8c6d2e1f0a5c7b9e3d1f2a6c4b7e9';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });

    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
