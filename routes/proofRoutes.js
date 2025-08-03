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

  // Only ticket is required
  if (!ticket) {
    return res.status(400).json({ error: 'Missing required field: ticket is required.' });
  }

  const proof_media = {};
  const serverPath = `/users_data/`;

  try {
    // Check and attach optional media
    if (req.files && req.files.voice_note && req.files.voice_note.length > 0) {
      const file = req.files.voice_note[0];
      proof_media.voice_note_url = `${serverPath}${file.filename}`;
    }

    if (req.files && req.files.image && req.files.image.length > 0) {
      const file = req.files.image[0];
      proof_media.image_url = `${serverPath}${file.filename}`;
    }

    if (req.files && req.files.video && req.files.video.length > 0) {
      const file = req.files.video[0];
      proof_media.video_url = `${serverPath}${file.filename}`;
    }

    // Create new Proof document with optional fields
    const proof = new Proof({
      ticket,
      user_id: user_id || null,
      recipient_id: recipient_id || null,
      worinstruction_id: worinstruction_id || null,
      recipient_name: recipient_name || null,
      proof_media: Object.keys(proof_media).length > 0 ? proof_media : null,
      rmarks: remarks || null
    });

    await proof.save();

    res.status(201).json({
      message: 'Proof saved successfully.',
      proof: {
        ...proof.toJSON(),
        created_at: proof.created_at
      }
    });
  } catch (error) {
    console.error('Error saving proof:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});




// 📤 GET /api/proofs/:user_id - Get proofs by user_id
router.get('/', async (req, res) => {
  const { user_id, ticket } = req.query;

  try {
    // Validate ObjectId formats
    if (user_id && !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: 'Invalid user_id format.' });
    }
    if (ticket && !mongoose.Types.ObjectId.isValid(ticket)) {
      return res.status(400).json({ error: 'Invalid ticket format.' });
    }

    // Build dynamic filter
    const filter = {};
    if (user_id) filter.user_id = user_id;
    if (ticket) filter.ticket = ticket;

    const proofs = await Proof.find(filter)
      .populate('ticket', 'type description status')
      .populate('recipient_id', 'name');

    res.json({ proofs });
  } catch (error) {
    console.error('Error fetching proofs:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});



// DELETE all proof entries
router.delete('/proofs/delete-all', async (req, res) => {
  try {
    const result = await Proof.deleteMany({});
    res.status(200).json({
      message: 'All proofs deleted successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete proofs',
      error: error.message,
    });
  }
});

module.exports = router;
