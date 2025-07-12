const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  recipient_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  type: {
    type: String,
    required: true,
    enum: ['technical', 'billing', 'general', 'other', 'Complaint'],
  },
  description: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    required: true,
    enum: ['Very Urgent', 'Normal', 'Urgent'],
  },
  deadline: Date,
  media: {
    voice_note_url: String,
    video_url: String,
    image_url: String,
  },
  status: {
    type: String,
    default: 'pending',
  },
  rights: {
    type: String,
    enum: ['View', 'Forward', 'Power']
  }
}, { timestamps: true });

// ✅ THIS LINE IS VERY IMPORTANT
module.exports = mongoose.model('Ticket', ticketSchema);
