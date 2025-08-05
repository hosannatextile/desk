const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Proof = require('../models/proof');

const uploadDir = path.join(__dirname, '..', 'users_data');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
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
  try {
    const {
      ticket,
      user_id,
      recipient_id,
      workinstruction_id,
      recipient_name,
      remarks
    } = req.body;

    if (!ticket) {
      return res.status(400).json({ error: 'Missing required field: ticket' });
    }

    const media_type = {};
    const uniqueSuffix = Date.now();
    const serverUrl = `${req.protocol}://${req.get('host')}`;

    // ✅ Save voice note as .mp3
    if (req.files.voice_note && req.files.voice_note.length > 0) {
      const file = req.files.voice_note[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_voice.mp3`);
      fs.renameSync(file.path, newPath);
      media_type.voice_note_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    // ✅ Save video as .mp4
    if (req.files.video && req.files.video.length > 0) {
      const file = req.files.video[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_video.mp4`);
      fs.renameSync(file.path, newPath);
      media_type.video_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    // ✅ Save image as .jpg
    if (req.files.image && req.files.image.length > 0) {
      const file = req.files.image[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_image.jpg`);
      fs.renameSync(file.path, newPath);
      media_type.image_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    // ✅ Save the Proof document
    const newProof = new Proof({
      ticket,
      user_id: user_id || null,
      recipient_id: recipient_id || null,
      workinstruction_id: workinstruction_id || null,
      recipient_name: recipient_name || null,
      proof_media: Object.keys(media_type).length > 0 ? media_type : null,
      rmarks: remarks || null
    });

    const savedProof = await newProof.save();

    res.status(201).json({
      success: true,
      message: 'Proof saved successfully.',
      proof: {
        ...savedProof.toJSON(),
        created_at: savedProof.created_at
      }
    });

  } catch (err) {
    console.error('Error saving proof:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});




// 📤 GET /api/proofs/:user_id - Get proofs by user_id
router.get('/proofs', async (req, res) => {
  const { user_id, workinstruction_id } = req.query;

  // Validate user_id
  if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: 'Valid user_id is required.' });
  }

  // Build query object
  const query = { user_id };
  
  // Optional: filter by workinstruction_id
  if (workinstruction_id) {
    if (!mongoose.Types.ObjectId.isValid(workinstruction_id)) {
      return res.status(400).json({ error: 'Invalid workinstruction_id format.' });
    }
    query.workinstruction_id = workinstruction_id;
  }

  try {
    const proofs = await Proof.find(query)
      .populate('ticket', 'type description status')
      .populate('recipient_id', 'name')
      .populate('workinstruction_id', 'title')
      .sort({ updated_at: -1 });

    // Add 5 hours to created_at
    const updatedProofs = proofs.map(proof => {
      const proofObj = proof.toObject();
      proofObj.created_at = new Date(new Date(proof.created_at).getTime() + 5 * 60 * 60 * 1000); // Add 5 hours
      return proofObj;
    });

    return res.status(200).json({ count: updatedProofs.length, proofs: updatedProofs });
  } catch (error) {
    console.error('Error fetching proofs:', error);
    return res.status(500).json({ error: 'Internal server error.' });
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
