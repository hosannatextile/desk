const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const WorkInstruction = require('../models/workinstruction');
const Proof = require('../models/proof');

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
  { name: 'image', maxCount: 1 }
]);


router.post('/', cpUpload, async (req, res) => {
  const {
    user_id,
    recipient_ids,
    review_time,
    type,
    remarks,
    order_type,
    media_select
  } = req.body;

  // Handle recipient_ids if passed as comma-separated string
  const recipientArray = Array.isArray(recipient_ids)
    ? recipient_ids
    : recipient_ids?.split(',').map(id => id.trim());

  // Handle media_select if passed as comma-separated string
  let mediaSelectList = Array.isArray(media_select)
    ? media_select
    : media_select?.split(',').map(type => type.trim());

  const proof_media = {};

  try {
    if (req.files?.audio?.[0]) {
      proof_media.audio_url = `/users_data/${req.files.audio[0].filename}`;
    }

    if (req.files?.video?.[0]) {
      proof_media.video_url = `/users_data/${req.files.video[0].filename}`;
    }

    if (req.files?.image?.[0]) {
      proof_media.image_url = `/users_data/${req.files.image[0].filename}`;
    }

    const workInstruction = new WorkInstruction({
      user_id,
      recipient_ids: recipientArray,
      type,
      remarks,
      proof_media,
      review_time,
      order_type,
      media_select: mediaSelectList,
      saved_time: new Date()
    });

    await workInstruction.save();

    res.status(201).json({
      message: 'WorkInstruction saved successfully.',
      workInstruction
    });
  } catch (error) {
    console.error('❌ Error saving WorkInstruction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//get the work_instructions on the basis of user_id
router.get('/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const { workinstruction_id, recipient_id } = req.query;

  // Validate user_id
  if (!mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: 'Invalid user_id format.' });
  }

  try {
    // Build query object
    const query = { user_id };
    if (workinstruction_id) {
      if (!mongoose.Types.ObjectId.isValid(workinstruction_id)) {
        return res.status(400).json({ error: 'Invalid workinstruction_id format.' });
      }
      query.workinstruction_id = workinstruction_id;
    }
    if (recipient_id) {
      if (!mongoose.Types.ObjectId.isValid(recipient_id)) {
        return res.status(400).json({ error: 'Invalid recipient_id format.' });
      }
      query.recipient_id = recipient_id;
    }

    // Fetch proofs with population
    const proofs = await Proof.find(query)
      .populate('ticket', 'type description status')
      .populate('recipient_id', 'name');

    // Map proofs to include created_at explicitly
    const formattedProofs = proofs.map(proof => ({
      ...proof.toJSON(),
      created_at: proof.created_at
    }));

    res.json({ user_id, proofs: formattedProofs });
  } catch (error) {
    console.error('Error fetching proofs:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

//work instructions on the basis of the recipient id
router.get('/recipient/:recipient_id', async (req, res) => {
  const { recipient_id } = req.params;

  try {
    const instructions = await WorkInstruction.find({ recipient_ids: recipient_id })
      .populate('user_id', 'name') // Optional: populate sender's name
      .sort({ saved_time: -1 });   // Newest first

    res.status(200).json({
      recipient_id,
      count: instructions.length,
      instructions
    });
  } catch (error) {
    console.error('Error fetching instructions by recipient:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/data/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const { workinstruction_id, recipient_id } = req.query;

  if (!mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: 'Invalid user_id format.' });
  }

  try {
    const query = { user_id };

    if (workinstruction_id) {
      if (!mongoose.Types.ObjectId.isValid(workinstruction_id)) {
        return res.status(400).json({ error: 'Invalid workinstruction_id format.' });
      }
      query._id = workinstruction_id;
    }

    if (recipient_id) {
      if (!mongoose.Types.ObjectId.isValid(recipient_id)) {
        return res.status(400).json({ error: 'Invalid recipient_id format.' });
      }
      query.recipient_ids = recipient_id;
    }

    const workInstructions = await WorkInstruction.find(query)
      .populate('user_id', 'fullName email')         // Include creator name + email
      .populate('recipient_ids', 'fullName email');  // Include recipient names + email

    res.json({ success: true, user_id, workInstructions });
  } catch (error) {
    console.error('Error fetching WorkInstructions:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});
module.exports = router;