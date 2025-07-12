const express = require('express');
const router = express.Router();
const Forgotpassword = require('../models/forgotpassword'); // adjust the path if needed
const User = require('../models/user');

// POST /forgotpassword
router.post('/', async (req, res) => {
  const { cnic, reason } = req.body;

  // Basic validation
  if (!cnic || !reason) {
    return res.status(400).json({ error: 'CNIC and reason are required.' });
  }

  try {
    // Find the user by CNIC
    const user = await User.findOne({ cnic });

    if (!user) {
      return res.status(404).json({ error: 'User with the given CNIC not found.' });
    }

    // Create forgot password entry with user ID
    const forgotEntry = new Forgotpassword({
      user_id: user._id,
      reason
    });

    await forgotEntry.save();

    res.status(201).json({
      message: 'Forgot password request created successfully.',
      data: forgotEntry
    });
  } catch (error) {
    console.error('Error creating forgot password request:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// GET /forgotpassword
router.get('/', async (req, res) => {
  try {
    const requests = await Forgotpassword.find()
      .populate('user_id', 'name email') // Optional: populate user details

    res.status(200).json({
      message: 'Forgot password requests fetched successfully.',
      data: requests
    });
  } catch (error) {
    console.error('Error fetching forgot password requests:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /forgotpassword/:user_id
router.delete('/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await Forgotpassword.deleteMany({ user_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No forgot password requests found for this user.' });
    }

    res.status(200).json({
      message: `Deleted ${result.deletedCount} forgot password request(s) for user.`,
    });
  } catch (error) {
    console.error('Error deleting forgot password requests:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});
module.exports = router;