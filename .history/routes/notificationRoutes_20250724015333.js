const express = require('express');
const router = express.Router();
const Notification = require('../models/notification'); // adjust path if needed
const User = require('../models/user');
const admin = require('../firebase/firebase'); // Firebase initialized

router.post('/', async (req, res) => {
  const { receiver_id, sender_id, type, description } = req.body;

  if (!receiver_id || !sender_id || !type || !description) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const validTypes = ['message', 'alert', 'request', 'info'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid notification type.' });
  }

  try {
    // Step 1: Save to DB
    const notification = new Notification({
      receiver_id,
      sender_id,
      type,
      description
    });

    await notification.save();

    // Step 2: Get receiver's FCM token
    const receiver = await User.findById(receiver_id);
    const sender = await User.findById(sender_id).select('fullName');

    if (!receiver || !receiver.fcm_token) {
      console.warn('Receiver FCM token not found, skipping push notification.');
    } else {
      // Step 3: Send FCM Push Notification
      const message = {
        token: receiver.fcm_token,
        notification: {
          title: `${type.toUpperCase()} from ${sender?.fullName || 'User'}`,
          body: description,
        },
        data: {
          type,
          sender_id,
          receiver_id,
          notification_id: notification._id.toString(),
        }
      };

      await admin.messaging().send(message);
    }

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
  const { receiver_id } = req.query;

  if (!receiver_id) {
    return res.status(400).json({ error: 'receiver_id is required as a query parameter.' });
  }

  try {
    const notifications = await Notification.find({ receiver_id }).sort({ createdAt: -1 });

    // Fetch sender names manually
    const notificationsWithSenderNames = await Promise.all(
      notifications.map(async (notif) => {
        let senderName = null;

        if (notif.sender_id) {
          const sender = await User.findById(notif.sender_id).select('fullName');
          senderName = sender ? sender.fullName : null;
        }

        return {
          ...notif.toObject(),
          sender_name: senderName, // 👈 new field added
        };
      })
    );

    res.status(200).json({ notifications: notificationsWithSenderNames });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['read', 'unread'];
  if (!validStatuses.includes(status)) {
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
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /user/update-token
router.post('/update-token', async (req, res) => {
  const { user_id, fcm_token } = req.body;

  if (!user_id || !fcm_token) {
    return res.status(400).json({ error: 'user_id and fcm_token are required.' });
  }

  try {
    const user = await User.findByIdAndUpdate(user_id, { fcm_token }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'FCM token updated successfully' });
  } catch (err) {
    console.error('Error updating FCM token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE all notifications
router.delete('/notifications/delete-all', async (req, res) => {
  try {
    const result = await Notification.deleteMany({});
    res.status(200).json({
      message: 'All notifications deleted successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete notifications',
      error: error.message,
    });
  }
});
module.exports = router;
