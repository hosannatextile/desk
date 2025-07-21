const mongoose = require('mongoose');
const TaskSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  assign_to: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }
  ],
  Details: {
    type: String,
    required: true,
  },
  media_type: {
    voice_note_url: String,
    video_url: String,
    image_url: String,
  },
  priority: {
    type: String,
    required: true,
  },
  targetget_date: {
    type: Date,
  },
  status: {
    type: String
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Task', TaskSchema);
