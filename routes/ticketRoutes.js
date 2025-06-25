const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Ticket = require('../models/ticket');
const User = require('../models/user');

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
    cb(null, Date.now() + path.extname(file.originalname));
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

  let parsedRecipients = recipient_ids;
  if (typeof recipient_ids === 'string') {
    try {
      parsedRecipients = JSON.parse(recipient_ids);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid recipient_ids format. Should be an array or JSON string.' });
    }
  }

  const media = {};
  const uniqueSuffix = Date.now();

  try {
    if (req.files.voice_note) {
      const file = req.files.voice_note[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_voice${path.extname(file.originalname)}`);
      fs.renameSync(file.path, newPath);
      media.voice_note_url = `/uploads/${path.basename(newPath)}`;
    }

    if (req.files.video) {
      const file = req.files.video[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_video${path.extname(file.originalname)}`);
      fs.renameSync(file.path, newPath);
      media.video_url = `/uploads/${path.basename(newPath)}`;
    }

    if (req.files.image) {
      const file = req.files.image[0];
      const newPath = path.join(uploadDir, `${uniqueSuffix}_image${path.extname(file.originalname)}`);
      fs.renameSync(file.path, newPath);
      media.image_url = `/uploads/${path.basename(newPath)}`;
    }

    const ticket = new Ticket({
      user_id,
      recipient_ids: parsedRecipients,
      type,
      description,
      priority,
      deadline,
      media,
      rights
    });

    await ticket.save();

    res.status(201).json({ message: 'Ticket created successfully.', ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Dashboard counts for a user
router.get('/summary/:user_id', async (req, res) => {
  const { user_id } = req.params;

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
          ]
        }
      }
    ]);

    const { typeCounts, statusCounts } = results[0];
    res.json({ user_id, typeCounts, statusCounts });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Filter tickets by user_id and status
router.get('/filter', async (req, res) => {
  const { user_id, status } = req.query;

  if (!user_id || !status) {
    return res.status(400).json({ error: 'user_id and status are required.' });
  }

  try {
    const tickets = await Ticket.find({ user_id, status }).select('type description priority deadline media status createdAt');

    res.json({
      tickets: tickets.map(ticket => ({
        ...ticket._doc,
        saved_at: ticket.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get all complaint tickets assigned to a recipient (filtered by optional status)
router.get('/recipient/:recipient_id', async (req, res) => {
  const { recipient_id } = req.params;
  const { status } = req.query;

  try {
    const query = {
      type: 'complaint',
      recipient_ids: recipient_id
    };

    if (status) {
      query.status = status;
    }

    const tickets = await Ticket.find(query);

    if (!tickets.length) {
      return res.status(404).json({ message: 'No tickets found.' });
    }

    const userIds = [...new Set(tickets.map(ticket => ticket.user_id.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).select('-password');

    const ticketDetails = tickets.map(ticket => {
      const user = users.find(u => u._id.toString() === ticket.user_id.toString());
      return {
        ticket,
        sender: user || null
      };
    });

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

module.exports = router;
