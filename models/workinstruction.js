const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WorkInstructionSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  proof_media: {
    audio_url: String,
    video_url: String,
    voice_url: String
  },
  type:{
    type:String
  },
  remarks:{
   type:String
  },
  saved_time: {
    type: Date,
    default: Date.now
  },
  review_time: {
    type: String,
    enum: ['daily', 'weekly', 'monthly','onetime'],
    required: true
  },
  order_type:{
    type:String,
    enum:['strict','Follow']
  }
},{ timestamps: true });

module.exports = mongoose.model('WorkInstruction', WorkInstructionSchema);
