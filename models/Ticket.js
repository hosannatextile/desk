const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  recipient_ids: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }
  ],
  type: {
    type: String,
    required: true,
  },
  description: {
    type: String
  },
  priority: {
    type: String,
    required: true,
  },
  deadline: {
    type: Date,
  },
  media: {
    voice_note_url: String,
    video_url: String,
    image_url: String,
  },
  status: {
    type: String,
    default: 'Active',
  },
  rights: {
    type: String,
    enum: ['View', 'Forward', 'Power'],
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Ticket', ticketSchema);