const express = require('express');
const router = express.Router();
const Assign = require('../models/assign'); // adjust the path as needed
const moment = require('moment'); // Install moment if not already: npm install moment
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const Ticket=require('../models/ticket')
const User = require('../models/user');
// Ensure uploads folder exists
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

// POST /assign
router.post('/assign', cpUpload, async (req, res) => {
  try {
    const {
      user_id,
      assign_to,
      Details,
      priority,
      targetget_date,
      status,
      ticket_id // <- Accepting ticket_id
    } = req.body;

    // Parse assign_to if it's a string
    let parsedAssignTo = assign_to;
    if (typeof assign_to === 'string') {
      try {
        parsedAssignTo = JSON.parse(assign_to);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid assign_to format. Should be a JSON array.' });
      }
    }

    const media_type = {};
    const uniqueSuffix = Date.now();
    const serverUrl = `${req.protocol}://${req.get('host')}`;

    if (req.files.voice_note) {
      const file = req.files.voice_note[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_voice${path.extname(file.originalname)}`);
      fs.renameSync(file.path, newPath);
      media_type.voice_note_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    if (req.files.video) {
      const file = req.files.video[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_video${path.extname(file.originalname)}`);
      fs.renameSync(file.path, newPath);
      media_type.video_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    if (req.files.image) {
      const file = req.files.image[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_image${path.extname(file.originalname)}`);
      fs.renameSync(file.path, newPath);
      media_type.image_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    // Create new assignment
    const newAssign = new Assign({
      ticket_id,
      user_id,
      assign_to: parsedAssignTo,
      Details,
      media_type,
      priority,
      targetget_date,
      status
    });

    const savedAssign = await newAssign.save();

    // ✅ Update the related ticket's status to "Assign"
    if (ticket_id && mongoose.Types.ObjectId.isValid(ticket_id)) {
      await Ticket.findByIdAndUpdate(ticket_id, { status: 'Assign' });
    }

    res.status(201).json({ success: true, data: savedAssign });

  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get('/assign', async (req, res) => {
  try {
    const { user_id, recipient_id, status } = req.query;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    // Step 1: Build dynamic filter for assignments
    const assignFilter = {
      $or: [
        { user_id: user_id },
        recipient_id ? { assign_to: recipient_id } : null
      ].filter(Boolean) // remove null if recipient_id not provided
    };

    if (status) {
      assignFilter.status = status;
    }

    const assignments = await Assign.find(assignFilter)
      .populate('user_id', 'fullName')
      .populate('assign_to', 'fullName');

    // Step 2: Find tickets where user is a recipient and status is 'assign' or 'Assign'
    const ticketFilter = {
      recipient_ids: user_id,
      status: { $in: ['assign', 'Assign'] }
    };

    const tickets = await Ticket.find(ticketFilter)
      .populate('user_id', 'fullName')
      .populate('recipient_ids', 'fullName');

    // Step 3: Get all ticket creator IDs
    const ticketUserIds = [
      ...new Set(tickets.map(ticket => ticket.user_id?._id?.toString()).filter(Boolean))
    ];

    const relatedUsers = await User.find({
      _id: { $in: ticketUserIds }
    }).select('fullName email department role');

    // Step 4: Return all results
    return res.status(200).json({
      success: true,
      assignments,
      tickets,
      ticketCount: tickets.length,
      relatedUsers
    });

  } catch (err) {
    console.error("Error in /assign:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});


// router.get('/assign', async (req, res) => {
//   try {
//     const { user_id, recipient_id, status } = req.query;

//     if (!user_id) {
//       return res.status(400).json({ success: false, message: "user_id is required" });
//     }

//     // Build dynamic filter
//     const filter = {
//       user_id
//     };

//     if (recipient_id) {
//       filter.assign_to = recipient_id;
//     }

//     if (status) {
//       filter.status = status;
//     }

//     const assignments = await Assign.find(filter).populate('user_id', 'name').populate('assign_to', 'name');

//     res.status(200).json({ success: true, data: assignments });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });



router.get('/assign/by-date-category', async (req, res) => {
  try {
    const { user_id, recipient_id } = req.query;

    if (!user_id || !recipient_id) {
      return res.status(400).json({ success: false, message: "user_id and recipient_id are required" });
    }

    const today = moment().startOf('day');

    // Step 1: Assignments (user_id + recipient_id in assign_to array)
    const assignmentFilter = {
      user_id,
      assign_to: recipient_id
    };

    const assignments = await Assign.find(assignmentFilter)
      .populate('user_id', 'fullName')
      .populate('assign_to', 'fullName');

    // Step 2: Categorize Assignments by Date
    const categorized = {
      today_tasks: [],
      weekly_tasks: [],
      pending_tasks: []
    };

    assignments.forEach(task => {
      if (!task.targetget_date) {
        categorized.pending_tasks.push(task);
        return;
      }

      const taskDate = moment(task.targetget_date).startOf('day');

      if (taskDate.isSame(today, 'day')) {
        categorized.today_tasks.push(task);
      } else if (taskDate.isAfter(today)) {
        categorized.weekly_tasks.push(task);
      } else {
        categorized.pending_tasks.push(task);
      }
    });

    // Step 3: Tickets where user is recipient and status is 'assign' or 'Assign'
    const ticketFilter = {
      recipient_ids: user_id,
      status: { $in: ['assign', 'Assign'] }
    };

    const tickets = await Ticket.find(ticketFilter)
      .populate('user_id', 'fullName')
      .populate('recipient_ids', 'fullName');

    // Step 4: Get distinct user_ids from tickets (creators)
    const ticketUserIds = [
      ...new Set(tickets.map(ticket => ticket.user_id?._id?.toString()).filter(Boolean))
    ];

    const relatedUsers = await User.find({
      _id: { $in: ticketUserIds }
    }).select('fullName email department role');

    // Step 5: Send response
    return res.status(200).json({
      success: true,
      ticketCount: tickets.length,
      categorizedAssignments: categorized,
      tickets,
      relatedUsers
    });

  } catch (err) {
    console.error("Error in /assign/by-date-category:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// GET /assign/count?recipient_id=USER_ID
router.get('/assign/count', async (req, res) => {
  const { recipient_id } = req.query;

  if (!recipient_id) {
    return res.status(400).json({ success: false, message: "recipient_id is required." });
  }

  try {
    const count = await Assign.countDocuments({
      assign_to: recipient_id
    });

    res.status(200).json({
      success: true,
      recipient_id,
      assignmentCount: count
    });
  } catch (err) {
    console.error("Error fetching assignment count:", err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;