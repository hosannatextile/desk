

const express = require('express');
const router = express.Router();
const ManagementWI = require('../models/management_wi');

// POST: Create a new management work instruction
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      recipient_ids,
      proof_media,
      type,
      remarks,
      review_time,
      order_type
    } = req.body;

    // Parse recipient_ids if it's a comma-separated string
    const recipientsArray = Array.isArray(recipient_ids)
      ? recipient_ids
      : recipient_ids?.split(',').map(id => id.trim());

    if (!user_id || !recipientsArray || recipientsArray.length === 0 || !review_time) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const newWI = new ManagementWI({
      user_id,
      recipient_ids: recipientsArray,
      proof_media, // must be an object with audio_url, video_url, image_url
      type,
      remarks,
      review_time,
      order_type
    });

    await newWI.save();
    res.status(201).json({ message: 'Work instruction created successfully.', data: newWI });
  } catch (error) {
    console.error('Error saving management WI:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET: Fetch all WIs by recipient_id
router.get('/:recipient_id', async (req, res) => {
  const { recipient_id } = req.params;

  try {
    const instructions = await ManagementWI.find({ recipient_id })
      .populate('user_id', 'name') // optionally populate creator info
      .populate('recipient_id', 'name') // optionally populate recipient info
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: instructions.length,
      recipient_id,
      instructions
    });
  } catch (error) {
    console.error('Error fetching work instructions:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
