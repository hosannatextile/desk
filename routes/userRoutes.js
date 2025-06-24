const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/user');
const authenticateToken = require('../middleware/auth');

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '../users_data/images/profile_images');
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

    // Required field validation
    if (
      !fullName || !mobileNumber || !cnic || !email || !department ||
      !role || !username || !password || status
    ) {
      return res.status(400).json({ error: 'All required fields must be filled.' });
    }

    // Rename file with CNIC if file uploaded
    let profilePhotoPath = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const newFileName = `${cnic}${ext}`;
      const oldPath = req.file.path;
      const newPath = path.join(path.dirname(oldPath), newFileName);

      // Rename file
      fs.renameSync(oldPath, newPath);

      // Save relative path
      profilePhotoPath = `users_data/images/profile_images/${newFileName}`;
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
      status
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);

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


module.exports = router;
