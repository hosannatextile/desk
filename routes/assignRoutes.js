const express = require('express');
const router = express.Router();
const Assign = require('../models/assign'); // adjust the path as needed
const moment = require('moment'); // Install moment if not already: npm install moment
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const Ticket=require('../models/Ticket')
const User = require('../models/user');
// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '..', 'users_data');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ✅ Fixed file extensions
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
      status,
      ticket_id
    } = req.body;

    // Parse assign_to if needed
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

    // Save assignment
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

    // ✅ Update related ticket
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


router.get('/adminreport-count', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: 'Valid user_id is required.' });
  }

  try {
    const now = new Date();

    // Get all Assign records where user is assigned
    const assigned = await Assign.find({ assign_to: user_id }).populate('ticket_id', 'user_id created_at').lean();

    let pending = 0;
    let completed = 0;
    let delayed = 0;

    for (const assign of assigned) {
      const isCompleted = assign.status?.toLowerCase() === 'completed';
      const isDelayed = assign.targetget_date && new Date(assign.targetget_date) < now;

      if (isCompleted) {
        completed++;
      } else if (isDelayed) {
        delayed++;
      } else {
        pending++;
      }
    }

    // Count all requested tickets where this user is the creator
    const requested = await Ticket.countDocuments({ user_id });

    const totalResolved = pending + completed + delayed;

    res.json({
      pending,
      completed,
      delayed,
      requested,
      totalResolved
    });

  } catch (error) {
    console.error('Error in /report-count:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// DELETE all assignments
router.delete('/assignments/delete-all', async (req, res) => {
  try {
    const result = await Assign.deleteMany({});
    res.status(200).json({
      message: 'All assignments deleted successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete assignments',
      error: error.message,
    });
  }
});

// ✅ API: Get all Admin users with their "Working" assignments
router.get('/admin-assignments', async (req, res) => {
  try {
    // 1. Fetch all Admins
    const admins = await User.find({ role: "Admin" })
      .select('fullName email role');

    if (!admins.length) {
      return res.status(404).json({ message: "No Admin users found" });
    }

    const adminIds = admins.map(a => a._id);

    // 2. Fetch assignments for these Admins, include Ticket details
    const assignments = await Assign.find({
      assign_to: { $in: adminIds },
      status: "Working"
    })
      .populate('user_id', 'fullName email')   // creator info
      .populate('assign_to', 'fullName email') // assignee info
      .populate('ticket_id')                   // ✅ bring in full Ticket details
      .lean();

    // 3. Merge Admins with their assignments
    const result = admins.map(admin => {
      return {
        ...admin.toObject(),
        assignments: assignments.filter(a =>
          a.assign_to.some(u => u._id.toString() === admin._id.toString())
        )
      };
    });

    res.status(200).json({
      message: "Admins with their Working assignments",
      data: result
    });

  } catch (error) {
    console.error("Error fetching Admin assignments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});




// ✅ API: Get all assignments with status = "Working"
router.get('/assignments/working', async (req, res) => {
  try {
    const assignments = await Assign.find({ status: "Working" })
      .populate('user_id', 'fullName email')   // populate user_id with name/email
      .populate('assign_to', 'fullName email') // populate assign_to with names
      .lean();

    res.status(200).json({
      message: "Assignments with status 'Working'",
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error("Error fetching working assignments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.get('/assignments', async (req, res) => {
  try {
    const assignments = await Assign.find()
      .populate('user_id', 'fullName email')   // populate user_id with name/email
      .populate('assign_to', 'fullName email') // populate assign_to with names
      .lean();

    res.status(200).json({
      message: "All assignments",
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error("Error fetching all assignments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.put('/update-status/:id', async (req, res) => {
  try {
    const { id } = req.params; // assign ID from URL
    const { status } = req.body; // new status from request body

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    // ✅ Find and update
    const updatedAssign = await Assign.findByIdAndUpdate(
      id,
      { status },
      { new: true } // return updated document
    );

    if (!updatedAssign) {
      return res.status(404).json({ message: "Assign not found" });
    }

    res.json({
      message: "Status updated successfully",
      data: updatedAssign
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;