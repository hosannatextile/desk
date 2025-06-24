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
    ref: 'User', // Assuming you have a User model
    required: true
  },
  recipient_id: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Recipient is also a User
    required: true
  },
  recipient_name: {
    type: String,
    required: true
  },
  proof_media: {
    voice_note_url: String,
    image_url: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  rmarks:{
    type:String,
  }
});

module.exports = mongoose.model('Proof', ProofSchema);
