const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WorkInstructionSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient_ids: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  ],
  proof_media: {
    audio_url: { type: String },
    video_url: { type: String },
    image_url: { type: String }
  },
  type: {
    type: String
  },
  remarks: {
    type: String
  },
  saved_time: {
    type: Date,
    default: Date.now
  },
  review_time: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'onetime'],
    required: true
  },
  order_type: {
    type: String,
    enum: ['strict', 'Follow']
  },
  media_select: [{
    type: String,
    enum: ['video', 'audio', 'image']
  }]
}, { timestamps: true });

module.exports = mongoose.model('WorkInstruction', WorkInstructionSchema);
