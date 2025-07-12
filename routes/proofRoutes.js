const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Proof = require('../models/proof');

const uploadDir = path.join(__dirname, '..', 'users_data', 'proofs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
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

// 📥 POST /api/proofs - Insert proof data
router.post('/', cpUpload, async (req, res) => {
  const { ticket, user_id, recipient_id, worinstruction_id, recipient_name, remarks } = req.body;

  // Validate required fields
  if (!ticket || !user_id || !recipient_id || !worinstruction_id || !recipient_name) {
    return res.status(400).json({ error: 'Missing required fields: ticket, user_id, recipient_id, worinstruction_id, and recipient_name are required.' });
  }

  const proof_media = {};
  const serverPath = `/users_data/proofs/`;

  try {
    // Handle file uploads
    if (req.files.voice_note) {
      const file = req.files.voice_note[0];
      proof_media.voice_note_url = `${serverPath}${file.filename}`;
    }

    if (req.files.image) {
      const file = req.files.image[0];
      proof_media.image_url = `${serverPath}${file.filename}`;
    }

    if (req.files.video) {
      const file = req.files.video[0];
      proof_media.video_url = `${serverPath}${file.filename}`;
    }

    // Create new Proof document
    const proof = new Proof({
      ticket,
      user_id,
      recipient_id,
      worinstruction_id,
      recipient_name,
      proof_media,
      rmarks: remarks // Map remarks to rmarks
    });

    await proof.save();

    // Return response with created_at
    res.status(201).json({
      message: 'Proof saved successfully.',
      proof: {
        ...proof.toJSON(),
        created_at: proof.created_at // Ensure created_at is included
      }
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
