const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const User = require('../models/user');
const Task = require('../models/task'); // adjust path as necessary
const cpUpload = require('../middleware/multer'); // assumes multer config is in middleware

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
    cb(null, Date.now() + path.extname(file.originalname)); // temp name
  }
});

const upload = multer({ storage });

const cpUpload = upload.fields([
  { name: 'voice_note', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

router.post('/assign', cpUpload, async (req, res) => {
  try {
    const {
      user_id,
      assign_to,
      Details,
      priority,
      targetget_date,
      status
    } = req.body;

    // Parse assign_to
    let parsedAssignTo = assign_to;
    if (typeof assign_to === 'string') {
      try {
        parsedAssignTo = JSON.parse(assign_to);
        if (!Array.isArray(parsedAssignTo)) {
          return res.status(400).json({ error: 'assign_to must be an array of user IDs.' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'Invalid assign_to format. Should be a JSON array.' });
      }
    }

    const media_type = {};
    const uniqueSuffix = Date.now();
    const serverUrl = `${req.protocol}://${req.get('host')}`;

    // ✅ Save voice note as .mp3
    if (req.files.voice_note) {
      const file = req.files.voice_note[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_voice.mp3`);
      fs.renameSync(file.path, newPath);
      media_type.voice_note_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    // ✅ Save video as .mp4
    if (req.files.video) {
      const file = req.files.video[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_video.mp4`);
      fs.renameSync(file.path, newPath);
      media_type.video_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    // ✅ Save image as .jpg
    if (req.files.image) {
      const file = req.files.image[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_image.jpg`);
      fs.renameSync(file.path, newPath);
      media_type.image_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    // ✅ Create and save the Task
    const newTask = new Task({
      user_id,
      assign_to: parsedAssignTo,
      Details,
      media_type,
      priority,
      targetget_date,
      status
    });

    const savedTask = await newTask.save();

    res.status(201).json({ success: true, data: savedTask });

  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get('/assign', async (req, res) => {
  try {
    const { user_id, recipient_id, status } = req.query;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    let taskFilter;

    // Build filter based on recipient_id presence
    if (recipient_id) {
      taskFilter = {
        $or: [
          { user_id: user_id },
          { assign_to: recipient_id }
        ]
      };
    } else {
      taskFilter = {
        $or: [
          { user_id: user_id },
          { assign_to: user_id }
        ]
      };
    }

    if (status) {
      taskFilter.status = status;
    }

    const tasks = await Task.find(taskFilter)
      .populate('user_id', 'fullName')
      .populate('assign_to', 'fullName');

    const creatorIds = [
      ...new Set(tasks.map(task => task.user_id?._id?.toString()).filter(Boolean))
    ];

    const relatedUsers = await User.find({ _id: { $in: creatorIds } })
      .select('fullName email department role');

    return res.status(200).json({
      success: true,
      tasks,
      taskCount: tasks.length,
      relatedUsers
    });

  } catch (err) {
    console.error("Error in /assign:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});


router.get('/tasks/recipient', async (req, res) => {
  try {
    const { recipient_id, status } = req.query;

    if (!recipient_id) {
      return res.status(400).json({ success: false, message: "recipient_id is required" });
    }

    // Build the query
    const query = {
      assign_to: recipient_id
    };

    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .populate('user_id', 'name email')        // Optional: populate task creator
      .populate('assign_to', 'name email');     // Optional: populate assigned users

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


module.exports = router;