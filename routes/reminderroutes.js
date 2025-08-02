const express = require('express');
const router = express.Router();
const Reminder = require('../models/reminder'); // Adjust path as needed

router.post('/reminder', async (req, res) => {
  const { ticket, user_id, recipient_id, recipient_name } = req.body;

  if (!ticket || !user_id || !recipient_id || !recipient_name) {
    return res.status(400).json({ error: 'ticket, user_id, recipient_id, and recipient_name are required.' });
  }

  try {
    const existingReminder = await Reminder.findOne({ ticket, user_id, recipient_id });

    if (existingReminder) {
      const count = parseInt(existingReminder.count || '0', 10);

      if (count < 3) {
        existingReminder.count = (count + 1).toString();
        await existingReminder.save();
        return res.status(200).json({ message: 'Reminder count updated.', reminder: existingReminder });
      } else {
        return res.status(200).json({ message: 'All reminders are sent already.' });
      }
    } else {
      const newReminder = new Reminder({
        ticket,
        user_id,
        recipient_id,
        recipient_name,
        count: '1'
      });

      await newReminder.save();
      return res.status(201).json({ message: 'Reminder created.', reminder: newReminder });
    }
  } catch (error) {
    console.error('Error in /reminder:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});


// GET /api/reminders/:recipient_id
router.get('/reminders/:recipient_id', async (req, res) => {
  const { recipient_id } = req.params;

  if (!recipient_id) {
    return res.status(400).json({ error: 'recipient_id is required.' });
  }

  try {
    const reminders = await Reminder.find({ recipient_id })
      .populate('ticket', 'type description status') // optionally populate ticket info
      .populate('user_id', 'name')                   // optionally populate sender info
      .sort({ updated_at: -1 });                     // latest first

    return res.status(200).json({ recipient_id, reminders });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});


module.exports = router;
