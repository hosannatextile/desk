const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Ticket = require('../models/ticket');
const User = require('../models/user');
const Assign = require('../models/assign');
const mongoose = require('mongoose');
const moment = require('moment'); // Or use native Date

const router = express.Router();

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
    cb(null, Date.now() + path.extname(file.originalname)); // initial temp name
  }
});

const upload = multer({ storage });

const cpUpload = upload.fields([
  { name: 'voice_note', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

// Create a ticket
router.post('/', cpUpload, async (req, res) => {
  const {
    user_id,
    recipient_ids,
    type,
    description,
    priority,
    deadline,
    rights
  } = req.body;

  if (!user_id || !recipient_ids || !type || !description || !priority) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const validRights = ['View', 'Forward', 'Power'];
  if (rights && !validRights.includes(rights)) {
    return res.status(400).json({ error: 'Invalid value for rights. Must be View, Forward, or Power.' });
  }

  let parsedRecipients = recipient_ids;
  if (typeof recipient_ids === 'string') {
    try {
      parsedRecipients = JSON.parse(recipient_ids);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid recipient_ids format. Should be a JSON array.' });
    }
  }

  const media = {};
  const uniqueSuffix = Date.now();
  const serverUrl = `${req.protocol}://${req.get('host')}`;

  try {
    if (req.files.voice_note) {
      const file = req.files.voice_note[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_voice.mp3`);
      fs.renameSync(file.path, newPath);
      media.voice_note_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    if (req.files.video) {
      const file = req.files.video[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_video.mp4`);
      fs.renameSync(file.path, newPath);
      media.video_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    if (req.files.image) {
      const file = req.files.image[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_image.jpg`);
      fs.renameSync(file.path, newPath);
      media.image_url = `${serverUrl}/users_data/${path.basename(newPath)}`;
    }

    const ticket = new Ticket({
      user_id,
      recipient_ids: parsedRecipients,
      type,
      description,
      priority,
      deadline,
      media,
      rights,
      created_at: new Date()
    });

    await ticket.save();

    res.status(201).json({
      message: 'Ticket created successfully.',
      ticket: {
        ...ticket.toJSON(),
        created_at: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// Dashboard counts for a user
router.get('/summary/:user_id', async (req, res) => {
  const { user_id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: 'Invalid user_id format.' });
  }

  try {
    const results = await Ticket.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(user_id) } },
      {
        $facet: {
          typeCounts: [
            {
              $group: {
                _id: '$type',
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                type: '$_id',
                count: 1
              }
            }
          ],
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                status: '$_id',
                count: 1
              }
            }
          ],
          timeLogs: [
            {
              $project: {
                _id: 0,
                created_at: 1
              }
            }
          ]
        }
      }
    ]);

    const { typeCounts = [], statusCounts = [], timeLogs = [] } = results[0] || {};
    res.json({ user_id, typeCounts, statusCounts, timeLogs });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


router.get('/filter', async (req, res) => {
  const { user_id, status } = req.query;

  if (!user_id || !status) {
    return res.status(400).json({ error: 'user_id and status are required.' });
  }
  if (!mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: 'Invalid user_id format.' });
  }

  try {
    const tickets = await Ticket.find({ user_id, status })
      .select('type description priority deadline media status created_at recipient_ids user_id')
      .populate('recipient_ids', 'fullName')
      .populate('user_id', 'fullName email role department'); // ✅ populate creator

    const enrichedTickets = [];

    for (const ticket of tickets) {
      const recipientInfo = ticket.recipient_ids.map(r => ({
        recipient_id: r._id,
        fullName: r.fullName
      }));

      const assignInfo = [];

      for (const recipient of ticket.recipient_ids) {
        const assignRecord = await Assign.findOne({
          user_id: recipient._id,
          ticket_id: ticket._id
        }).lean();

        if (assignRecord) {
          const assignUsers = await User.find({
            _id: { $in: assignRecord.assign_to }
          }).select('fullName email role department').lean();

          assignInfo.push({
            recipient_id: recipient._id,
            assignUsers,
            details: assignRecord.Details,
            media_type: assignRecord.media_type,
            priority: assignRecord.priority,
            targetget_date: assignRecord.targetget_date,
            status: assignRecord.status,
            created_at: assignRecord.created_at
          });
        }
      }

      enrichedTickets.push({
        ...ticket.toJSON(),
        assignInfo,
      });
    }

    res.json({ tickets: enrichedTickets });

  } catch (error) {
    console.error('Error in /filter route:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


router.get('/filtertwo', async (req, res) => {
  const { user_id, manager_id } = req.query;

  if (!user_id || !manager_id) {
    return res.status(400).json({ error: 'user_id and manager_id are required.' });
  }

  if (!mongoose.Types.ObjectId.isValid(user_id) || !mongoose.Types.ObjectId.isValid(manager_id)) {
    return res.status(400).json({ error: 'Invalid ObjectId format.' });
  }

  try {
    // 1. Find Assignments where user_id is manager and assign_to includes user_id
    const assigns = await Assign.find({
      user_id: manager_id,
      assign_to: user_id
    }).lean();

    const ticketIds = assigns.map(a => a.ticket_id);
    const assignToUserIds = [...new Set(assigns.flatMap(a => a.assign_to.map(id => id.toString())))];

    // 2. Get full User details for assign_to users
    const assignToUsersMap = {};
    const assignToUsers = await User.find({ _id: { $in: assignToUserIds } }).select('fullName email role department');
    assignToUsers.forEach(user => {
      assignToUsersMap[user._id.toString()] = user;
    });

    // 3. Get corresponding Tickets and populate
    const tickets = await Ticket.find({ _id: { $in: ticketIds } })
      .populate('recipient_ids', 'fullName')
      .populate('user_id', 'fullName email role department');

    // 4. Enrich ticket data
    const enriched = tickets.map(ticket => {
      const assignRecord = assigns.find(a => a.ticket_id?.toString() === ticket._id.toString());

      return {
        ticket_id: ticket._id,
        type: ticket.type,
        description: ticket.description,
        priority: ticket.priority,
        deadline: ticket.deadline,
        media: ticket.media,
        status: ticket.status,
        created_at: ticket.created_at,

        recipients: ticket.recipient_ids.map(r => ({
          recipient_id: r._id,
          fullName: r.fullName
        })),

        assign_details: assignRecord ? {
          manager_id: assignRecord.user_id,
          assign_to: assignRecord.assign_to.map(id => ({
            _id: id,
            fullName: assignToUsersMap[id.toString()]?.fullName || null,
            email: assignToUsersMap[id.toString()]?.email || null,
            role: assignToUsersMap[id.toString()]?.role || null,
            department: assignToUsersMap[id.toString()]?.department || null
          })),
          details: assignRecord.Details,
          media_type: assignRecord.media_type,
          priority: assignRecord.priority,
          targetget_date: assignRecord.targetget_date,
          status: assignRecord.status,
          created_at: assignRecord.created_at
        } : null,

        created_by: {
          user_id: ticket.user_id?._id,
          fullName: ticket.user_id?.fullName,
          email: ticket.user_id?.email,
          role: ticket.user_id?.role,
          department: ticket.user_id?.department
        }
      };
    });

    res.json({ tickets: enriched });

  } catch (error) {
    console.error('Error in /filtertwo:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});







// Get all complaint tickets assigned to a recipient (filtered by optional status)
router.post('/recipient/:recipient_id', async (req, res) => {
  const { recipient_id } = req.params;
  const { status, type } = req.query;

  try {
    // Build query object with recipient_id as the primary filter
    const query = {
      recipient_ids: { $in: [recipient_id] }, // Match recipient_id in array
    };

    // Optionally add type to query if provided
    if (type) {
      query.type = type;
    }

    // Optionally add status to query if provided
    if (status) {
      query.status = status;
    }

    // Fetch tickets matching the query
    const tickets = await Ticket.find(query);

    // Check if tickets exist
    if (!tickets.length) {
      return res.status(404).json({ message: 'No tickets found.' });
    }

    // Get unique user IDs from tickets
    const userIds = [...new Set(tickets.map(ticket => ticket.user_id.toString()))];

    // Fetch users associated with the tickets
    const users = await User.find({ _id: { $in: userIds } }).select('-password');

    // Map tickets to include sender details
    const ticketDetails = tickets.map(ticket => {
      const user = users.find(u => u._id.toString() === ticket.user_id.toString());
      return {
        ticket,
        sender: user || null,
      };
    });

    // Return response with ticket count and details
    res.status(200).json({ count: ticketDetails.length, ticketDetails });
  } catch (error) {
    console.error('Error fetching complaint tickets:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


//forward the ticket
router.put('/forward', async (req, res) => {
  const { ticket_id, recipient_id, rights } = req.body;

  if (!ticket_id || !recipient_id || !rights) {
    return res.status(400).json({ error: 'ticket_id, recipient_id, and rights are required.' });
  }

  if (!['View', 'Forward', 'Power'].includes(rights)) {
    return res.status(400).json({ error: 'Invalid rights value.' });
  }

  try {
    const ticket = await Ticket.findById(ticket_id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    // Replace recipient_ids with the new recipient_id
    ticket.recipient_ids = [recipient_id];

    // Update rights
    ticket.rights = rights;

    await ticket.save();

    res.status(200).json({
      message: 'Ticket forwarded successfully.',
      ticket
    });
  } catch (error) {
    console.error('Error forwarding ticket:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get all assigned tickets by recipient_id
router.get('/recipient/totaltickets/:recipient_id', async (req, res) => {
  const { recipient_id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(recipient_id)) {
    return res.status(400).json({ error: 'Invalid recipient_id' });
  }

  try {
    // Find all matching tickets
    const tickets = await Ticket.find({ recipient_ids: recipient_id })
      .populate('user_id', 'fullName') // Changed 'name' to 'fullName'
      .sort({ createdAt: -1 });

    // Count total and group by type
    const typeCounts = await Ticket.aggregate([
      { $match: { recipient_ids: new mongoose.Types.ObjectId(recipient_id) } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // Format type counts to object: { bug: 3, feature: 2, ... }
    const countsByType = {};
    typeCounts.forEach((item) => {
      countsByType[item._id] = item.count;
    });

    res.status(200).json({
      recipient_id,
      total_tickets: tickets.length,
      tickets,
      type_counts: countsByType,
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// PATCH /tickets/:id/assign
router.patch('/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { assign } = req.body;

  if (!assign) {
    return res.status(400).json({ error: 'Assigned user ID is required.' });
  }

  try {
    // Optionally check if the user exists
    const user = await User.findById(assign);
    if (!user) {
      return res.status(404).json({ error: 'Assigned user not found.' });
    }

    // Update the ticket
    const updatedTicket = await Ticket.findByIdAndUpdate(
      id,
      { assign },
      { new: true }
    ).populate('assign', 'name email'); // populate assigned user details if needed

    if (!updatedTicket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    res.status(200).json({
      message: 'Ticket assigned successfully.',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


//getticketmedia

router.get('/getmedia/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'users_data', req.params.filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found.' });
  }
});


// PATCH /ticket/update-status
router.patch('/update-status', async (req, res) => {
  const { ticket_id, user_id, recipient_id, status } = req.body;

  if (!ticket_id || !user_id || !recipient_id || !status) {
    return res.status(400).json({ error: 'ticket_id, user_id, recipient_id, and status are required.' });
  }

  try {
    // First check if such a ticket exists
    const ticket = await Ticket.findOne({
      _id: ticket_id,
      user_id,
      recipient_ids: recipient_id
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found or access denied.' });
    }

    // Update the status
    ticket.status = status;
    await ticket.save();

    res.status(200).json({
      message: 'Ticket status updated successfully.',
      ticket
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

//for backlog
router.get('/tickets/overdue', async (req, res) => {
  try {
    const { user_id, recipient_id } = req.query;

    // Build dynamic filter
    const filter = {
      status: { $ne: 'resolved' }, // status is not "resolved"
      deadline: { $lt: new Date() } // deadline has passed
    };

    if (user_id) {
      filter.user_id = user_id;
    }

    if (recipient_id) {
      filter.recipient_ids = recipient_id; // Match recipient in array
    }

    const tickets = await Ticket.find(filter)
      .populate('user_id', 'name')
      .populate('recipient_ids', 'name');

    res.status(200).json({ success: true, data: tickets });
  } catch (err) {
    console.error('Error fetching overdue tickets:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


//for dashboard to see all tickets details
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);

router.get('/tickets/categorized', async (req, res) => {
  try {
    const tickets = await Ticket.find({}).populate('user_id', 'name').populate('recipient_ids', 'name');

    const categorized = {
      completed: [],
      pending: [],
      active: [],
      rejection: [],
      training: []
    };

    const now = new Date();

    tickets.forEach(ticket => {
      const deadline = ticket.deadline ? new Date(ticket.deadline) : null;
      const status = ticket.status?.toLowerCase();

      if (status === 'rejected') {
        categorized.rejection.push(ticket);
      } else if (status === 'training') {
        categorized.training.push(ticket);
      }
       else if (deadline && deadline < now) {
        if (status === 'complete' || status === 'completed') {
          categorized.completed.push(ticket);
        } else {
          categorized.pending.push(ticket);
        }
      } else if (deadline && deadline.toDateString() === startOfToday.toDateString()) {
        if (status !== 'pending') {
          categorized.active.push(ticket);
        }
      }
    });

    res.status(200).json({ success: true, data: categorized });

  } catch (error) {
    console.error('Error fetching categorized tickets:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});





router.get('/count-today/:user_id', async (req, res) => {
  const { user_id } = req.params;

  // Validate user_id
  if (!mongoose.Types.ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: 'Invalid user_id format.' });
  }

  try {
    // Define today's date range in PKT (Pakistan Standard Time, UTC+5)
    const now = new Date();
    const todayPKT = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0)); // Start of day in PKT
    const tomorrowPKT = new Date(todayPKT);
    tomorrowPKT.setDate(todayPKT.getDate() + 1); // Start of next day in PKT

    // Filter for tickets created today by user_id
    const filter = {
      user_id,
      created_at: {
        $gte: todayPKT,
        $lt: tomorrowPKT
      }
    };

    // Count total tickets
    const totalCount = await Ticket.countDocuments(filter);

    // Count completed tickets
    const completedCount = await Ticket.countDocuments({
      ...filter,
      status: 'completed'
    });

    res.json({
      user_id,
      date: todayPKT.toISOString().split('T')[0],
      totalCreatedToday: totalCount,
      completedToday: completedCount
    });

  } catch (error) {
    console.error('Error counting today\'s tickets:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


module.exports = router;