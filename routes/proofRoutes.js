const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Proof = require('../models/proof');

const uploadDir = path.join(__dirname, '../users_data/proofs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const field = file.fieldname;
    const userId = req.body.user_id || 'unknown';
    cb(null, `${userId}_${field}${ext}`);
  }
});

const upload = multer({ storage });

const cpUpload = upload.fields([
  { name: 'voice_note', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

// 📥 POST /api/proofs - Insert proof data
router.post('/', cpUpload, async (req, res) => {
  const { ticket, user_id, recipient_id, recipient_name,remarks } = req.body;

  if (!ticket || !user_id || !recipient_id || !recipient_name || remarks) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const proof_media = {};

  if (req.files.voice_note) {
    const file = req.files.voice_note[0];
    proof_media.voice_note_url = `/users_data/proofs/${file.filename}`;
  }

  if (req.files.image) {
    const file = req.files.image[0];
    proof_media.image_url = `/users_data/proofs/${file.filename}`;
  }

  try {
    const proof = new Proof({
      ticket,
      user_id,
      recipient_id,
      recipient_name,
      proof_media,
      remarks
    });

    await proof.save();

    res.status(201).json({
      message: 'Proof saved successfully.',
      proof
    });
  } catch (error) {
    console.error('Error saving proof:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});



// 📤 GET /api/proofs/:user_id - Get proofs by user_id
router.get('/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const proofs = await Proof.find({ user_id }).populate('ticket', 'type description status').populate('recipient_id', 'name');

    res.json({ user_id, proofs });
  } catch (error) {
    console.error('Error fetching proofs:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
