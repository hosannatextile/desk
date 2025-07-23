const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Response = require('../models/ticketresponse'); // adjust path as needed

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'users_data');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const cpUpload = upload.fields([
  { name: 'voice_note', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

// Create a response
router.post('/response', cpUpload, async (req, res) => {
  const {
    user_id,
    response_person_id,
    ticket_id,
    type,
    description,
    priority,
    deadline,
    rights
  } = req.body;

  if (!user_id || !response_person_id || !ticket_id || !type || !description || !priority) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Validate 'rights' enum
  const validRights = ['View', 'Forward', 'Power'];
  if (rights && !validRights.includes(rights)) {
    return res.status(400).json({ error: 'Invalid value for rights. Must be View, Forward, or Power.' });
  }

  const media = {};
  const uniqueSuffix = Date.now();
  const serverUrl = `${req.protocol}://${req.get('host')}`;

  try {
    if (req.files.voice_note) {
      const file = req.files.voice_note[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_voice${path.extname(file.originalname)}`);
      fs.renameSync(file.path, newPath);
      media.voice_note_url = `${serverUrl}/uploads/${path.basename(newPath)}`;
    }

    if (req.files.video) {
      const file = req.files.video[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_video${path.extname(file.originalname)}`);
      fs.renameSync(file.path, newPath);
      media.video_url = `${serverUrl}/uploads/${path.basename(newPath)}`;
    }

    if (req.files.image) {
      const file = req.files.image[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_image${path.extname(file.originalname)}`);
      fs.renameSync(file.path, newPath);
      media.image_url = `${serverUrl}/uploads/${path.basename(newPath)}`;
    }

    const response = new Response({
      user_id,
      response_person_id,
      ticket_id,
      type,
      description,
      priority,
      deadline,
      media,
      rights
    });

    await response.save();

    res.status(201).json({ message: 'Response created successfully.', response });
  } catch (error) {
    console.error('Error creating response:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


router.get('/response', async (req, res) => {
  try {
    const { response_person_id, ticket_id, user_id } = req.query;

    // Validate required fields
    if (!ticket_id) {
      return res.status(400).json({
        success: false,
        message: 'ticket_id is required.'
      });
    }

    // Build dynamic filter
    const filter = {
      ticket_id
    };

    if (response_person_id) {
      filter.response_person_id = response_person_id;
    }

    if (user_id) {
      filter.user_id = user_id;
    }

    // Fetch and populate
    const responses = await Response.find(filter)
      .populate('user_id', 'name')
      .populate('response_person_id', 'name')
      .populate('ticket_id');

    res.status(200).json({
      success: true,
      data: responses
    });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});


module.exports = router;
