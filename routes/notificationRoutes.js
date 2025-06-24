const express = require('express');
const router = express.Router();
const Notification = require('../models/notification'); // adjust path if needed


router.post('/', async (req, res) => {
  const { receiver_cnic, sender_cnic, type, description } = req.body;

  
  if (!receiver_cnic || !sender_cnic || !type || !description) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Create and save new notification
    const notification = new Notification({
      receiver_cnic,
      sender_cnic,
      type,
      description,
      // status and datetime will use default values
    });

    await notification.save();

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/', async (req, res) => {
  const { receiver_cnic, status } = req.query;

  if (!receiver_cnic || !status) {
    return res.status(400).json({ error: 'receiver_cnic and status are required as query parameters.' });
  }

  try {
    const notifications = await Notification.find({
      receiver_cnic,
      status
    });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate input
  if (!['read', 'unread'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value. Use "read" or "unread".' });
  }

  try {
    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedNotification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification status updated successfully',
      notification: updatedNotification,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
