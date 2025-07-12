const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  response_person_id: 
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
   ticket_id: 
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },
  type: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
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
    default: 'pending',
  },
  rights: {
    type: String,
    enum: ['View', 'Forward', 'Power'],
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

module.exports = mongoose.model('Response', ResponseSchema);
