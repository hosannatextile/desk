const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/user');
const mongoose = require('mongoose');
const authenticateToken = require('../middleware/auth');

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '..', 'users_data');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Temporarily name the file with timestamp or generic name
    const ext = path.extname(file.originalname);
    const tempName = Date.now() + ext;
    cb(null, tempName);
  }
});

const upload = multer({ storage });

router.use(authenticateToken);
// GET users by role (optional)
router.get('/', async (req, res) => {
  try {
    // Extract the role query parameter (if provided)
    const role = req.query.role;

    let users;
    if (role) {
      // Filter users by the provided role
      users = await User.find({ role });
    } else {
      // If no role is provided, get all users
      users = await User.find();
    }

    // Convert profile photos to base64 (same as before)
    const usersWithImages = await Promise.all(users.map(async user => {
      let profilePhotoBase64 = null;

      if (user.profilePhoto) {
        const imagePath = path.join(__dirname, '..', user.profilePhoto);
        try {
          const imageBuffer = fs.readFileSync(imagePath);
          profilePhotoBase64 = imageBuffer.toString('base64');
        } catch (err) {
          console.error(`Image not found for CNIC ${user.cnic}:`, err.message);
        }
      }

      return {
        ...user.toObject(),
        profilePhoto: profilePhotoBase64, // Replace URL with base64
      };
    }));

    res.json(usersWithImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// POST new user with optional profile photo
router.post('/', upload.single('profilePhoto'), async (req, res) => {
  try {
    const {
      fullName,
      mobileNumber,
      cnic,
      email,
      department,
      role,
      username,
      password,
      status
    } = req.body;

    // Required fields validation
    const missingFields = [];
    if (!fullName) missingFields.push('fullName');
    if (!mobileNumber) missingFields.push('mobileNumber');
    if (!cnic) missingFields.push('cnic');
    if (!email) missingFields.push('email');
    if (!department) missingFields.push('department');
    if (!role) missingFields.push('role');
    if (!username) missingFields.push('username');
    if (!password) missingFields.push('password');
    if (!status) missingFields.push('status');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Required fields are missing',
        missingFields
      });
    }

    // File upload and renaming
    let profilePhotoPath = null;
    let profilePhotoUrl = null;
    const uniqueSuffix = Date.now();
    const serverUrl = `${req.protocol}://${req.get('host')}`;

    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const newFileName = `${cnic}_${uniqueSuffix}${ext}`;
      const oldPath = req.file.path;
      const newPath = path.join(path.dirname(oldPath), newFileName);

      fs.renameSync(oldPath, newPath);

      profilePhotoPath = `users_data/${newFileName}`;
      profilePhotoUrl = `${serverUrl}/${profilePhotoPath}`;
    }

    const newUser = new User({
      fullName,
      mobileNumber,
      cnic,
      email,
      profilePhoto: profilePhotoPath,
      department,
      role,
      username,
      password,
      status,
      created_at: new Date()
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      message: 'User created successfully.',
      user: {
        ...savedUser.toJSON(),
        profilePhotoUrl,
        created_at: savedUser.created_at
      }
    });

  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate email, CNIC, or username.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

//delete any user
router.delete('/:cnic', async (req, res) => {
  try {
    const cnic = req.params.cnic;

    // Find the user by CNIC
    const user = await User.findOne({ cnic });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Delete profile photo if it exists
    if (user.profilePhoto) {
      const imagePath = path.join(__dirname, '..', user.profilePhoto);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (err) {
        console.error('Error deleting image:', err.message);
      }
    }

    // Delete the user from DB
    await User.deleteOne({ cnic });

    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id/status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User status updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});


// PATCH /api/users/:id/last-seen
router.patch('/:id/last-seen', async (req, res) => {
  const userId = req.params.id;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { lastSeen: new Date() },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      message: 'Last seen updated successfully.',
      lastSeen: updatedUser.lastSeen
    });
  } catch (error) {
    console.error('Error updating last seen:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE all users
router.delete('/users/delete-all', async (req, res) => {
  try {
    const result = await User.deleteMany({});
    res.status(200).json({
      message: 'All users deleted successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete users',
      error: error.message,
    });
  }
});

// DELETE one user by ID
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const result = await User.findByIdAndDelete(userId);

    if (!result) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    res.status(200).json({
      message: 'User deleted successfully',
      deletedUserId: userId,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete user',
      error: error.message,
    });
  }
});


// Update User API
router.put('/update-user/:id', upload.single('profilePhoto'), async (req, res) => {
  try {
    const { id } = req.params; // user_id from URL
    let updates = req.body; // fields to update (optional)

    // If no updates and no file provided
    if ((!updates || Object.keys(updates).length === 0) && !req.file) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    let profilePhotoPath = null;
    let profilePhotoUrl = null;
    const serverUrl = `${req.protocol}://${req.get('host')}`;

    if (req.file) {
      const uniqueSuffix = Date.now();
      const ext = path.extname(req.file.originalname);
      const newFileName = `${id}_${uniqueSuffix}${ext}`;
      const oldPath = req.file.path;
      const newPath = path.join(path.dirname(oldPath), newFileName);

      // Rename file
      fs.renameSync(oldPath, newPath);

      profilePhotoPath = `users_data/${newFileName}`;
      profilePhotoUrl = `${serverUrl}/${profilePhotoPath}`;

      // Add to updates
      updates.profilePhoto = profilePhotoPath;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      user: {
        ...updatedUser.toJSON(),
        profilePhotoUrl
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
});


// ✅ API: Get all Admin user IDs
router.get('/admin-ids', async (req, res) => {
  try {
    const admins = await User.find({ role: "Admin" }).select('_id');

    res.status(200).json({
      message: "List of Admin user IDs",
      ids: admins.map(a => a._id)
    });
  } catch (error) {
    console.error("Error fetching Admin IDs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
