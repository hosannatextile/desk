const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  recipient_ids: [{ // Changed from recipient_id to recipient_ids
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Each element refers to a User
    required: true
  }],
  type: {
    type: String,
    required: true,
<<<<<<< HEAD
    enum: ['technical', 'billing', 'general', 'other','Complaint'],
=======
>>>>>>> 532324c85c5d94fffca12a3a880bad1badd3e128
  },
  description: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    required: true,
<<<<<<< HEAD
    enum: ['Very Urgent', 'Normal', 'Urgent'],
=======
>>>>>>> 532324c85c5d94fffca12a3a880bad1badd3e128
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
  rights:{
    type:String,
    enum: ['View','Forward','Power']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ticket', ticketSchema);
