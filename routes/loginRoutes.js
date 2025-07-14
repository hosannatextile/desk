const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');

require('dotenv').config();

const ACCESS_TOKEN_SECRET = 'a9f83b7f1d6e4c8a9e6f2c3b0d1f7a3e4b8c6d2e1f0a5c7b9e3d1f2a6c4b7e9';
const REFRESH_TOKEN_SECRET = 'a9f83b7f1d6e4c8a9e6f2c3b0d1f7a3e4b8c6d2e1f0a5c7b9e3d1f2a6c4b7e9';

let refreshTokens = []; // For demo only. Use DB in production.

const multer = require('multer');

// Set up Multer for handling form-data (no file here, just fields)
const upload = multer();

// Use this middleware to handle form-data parsing
router.post('/', async (req, res) => {
  try {
    const { cnic, password, role, fcm_token } = req.body;

    if (!cnic || !password || !role) {
      return res.status(400).json({ error: 'CNIC, password, and role are required.' });
    }

    const user = await User.findOne({ cnic, password, role });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials or role.' });
    }

    if (fcm_token && user.fcm_token !== fcm_token) {
      user.fcm_token = fcm_token;
      await user.save();
    }

    const payload = {
      userId: user._id,
      cnic: user.cnic,
      role: user.role
    };

    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    refreshTokens.push(refreshToken);

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        cnic: user.cnic,
        email: user.email,
        role: user.role,
        username: user.username
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});


router.post('/emaillogin', async (req, res) => {
  const { email, password, role, fcm_token } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Build query dynamically with optional role
    const userQuery = { email, password };
    if (role) userQuery.role = role;

    const user = await User.findOne(userQuery);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email, password, or role.' });
    }

    // ✅ Update fcm_token if provided
    if (fcm_token) {
      user.fcm_token = fcm_token;
      await user.save(); // Save updated token to DB
    }

    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    refreshTokens.push(refreshToken); // In production, store securely

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        cnic: user.cnic,
        role: user.role,
        username: user.username
      }
    });

  } catch (err) {
    console.error('Email login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken || !refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }

  jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });

    const newAccessToken = jwt.sign({
      userId: user.userId,
      cnic: user.cnic,
      role: user.role
    }, ACCESS_TOKEN_SECRET, { expiresIn: '30m' });

    res.json({ accessToken: newAccessToken });
  });
});

module.exports = router;
