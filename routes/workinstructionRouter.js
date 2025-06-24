const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const WorkInstruction = require('../models/workinstruction');

const uploadDir = path.join(__dirname, '../users_data/work_instructions');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const field = file.fieldname;
    const userId = req.body.user_id || 'unknown';
    cb(null, `${userId}_${field}${ext}`);
  }
});

const upload = multer({ storage });

const cpUpload = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'voice', maxCount: 1 }
]);


router.post('/', cpUpload, async (req, res) => {
  const { user_id, recipient_id, review_time,type,remarks } = req.body;

  if (!user_id || !recipient_id || !review_time || !type || !remarks) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const proof_media = {};

  try {
    if (req.files.audio) {
      proof_media.audio_url = `/users_data/work_instructions/${req.files.audio[0].filename}`;
    }

    if (req.files.video) {
      proof_media.video_url = `/users_data/work_instructions/${req.files.video[0].filename}`;
    }

    if (req.files.voice) {
      proof_media.voice_url = `/users_data/work_instructions/${req.files.voice[0].filename}`;
    }

    const workInstruction = new WorkInstruction({
      user_id,
      recipient_id,
      type,
      remarks,
      proof_media,
      review_time,
      saved_time: new Date()
    });

    await workInstruction.save();

    res.status(201).json({
      message: 'WorkInstruction saved successfully.',
      workInstruction
    });
  } catch (error) {
    console.error('Error saving work instruction:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

//get the work_instructions on the basis of user_id
router.get('/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const instructions = await WorkInstruction.find({ user_id })
      .populate('recipient_id', 'name') // Optional: populate recipient name if User model has it
      .sort({ saved_time: -1 }); // Newest first

    res.status(200).json({
      user_id,
      count: instructions.length,
      instructions
    });
  } catch (error) {
    console.error('Error fetching work instructions:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;