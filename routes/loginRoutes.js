const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');

require('dotenv').config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'a9f83b7f1d6e4c8a9e6f2c3b0d1f7a3e4b8c6d2e1f0a5c7b9e3d1f2a6c4b7e9';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'b7e9a9f83b7f1d6e4c8a9e6f2c3b0d1f7a3e4b8c6d2e1f0a5c7b9e3d1f2a6c4';

// ✅ CNIC Login
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

    // Update FCM token if needed
    if (fcm_token && user.fcm_token !== fcm_token) {
      user.fcm_token = fcm_token;
    }

    const payload = {
      userId: user._id,
      cnic: user.cnic,
      role: user.role
    };

    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    // Save refresh token in DB
    user.referesh_token = refreshToken;
    await user.save();

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
        username: user.username,
        profilePhoto: user.profilePhoto || null
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ✅ Email Login
router.post('/emaillogin', async (req, res) => {
  const { email, password, role, fcm_token } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const userQuery = { email, password };
    if (role) userQuery.role = role;

    const user = await User.findOne(userQuery);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email, password, or role.' });
    }

    if (fcm_token) {
      user.fcm_token = fcm_token;
    }

    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    // Save refresh token in DB
    user.referesh_token = refreshToken;
    await user.save();

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
        username: user.username,
        profilePhoto: user.profilePhoto || null
      }
    });

  } catch (err) {
    console.error('Email login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ✅ Refresh Token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(403).json({ error: 'Refresh token is required' });
  }

  try {
    // Find user by refresh token
    const user = await User.findOne({ referesh_token: refreshToken });

    if (!user) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, decodedUser) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });

      const newAccessToken = jwt.sign(
        {
          userId: decodedUser.userId,
          cnic: decodedUser.cnic,
          role: decodedUser.role,
          email: decodedUser.email
        },
        ACCESS_TOKEN_SECRET,
        { expiresIn: '30m' }
      );

      res.json({ accessToken: newAccessToken });
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Server error during token refresh' });
  }
});

module.exports = router;
