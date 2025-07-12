const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProofSchema = new Schema({
  ticket: {
    type: Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
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
  workinstruction_id:{
    type: Schema.Types.ObjectId,
    ref: 'WorkInstruction',
    required: true
  },
  recipient_name: {
    type: String,
    required: true
  },
  proof_media: {
    voice_note_url: String,
    image_url: String,
    video_url: String
  },
  rmarks: {
    type: String,
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Proof', ProofSchema);
