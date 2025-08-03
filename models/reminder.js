const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Reminderschema = new Schema({
  ticket: {
    type: Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  recipient_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    
  },
  count: {
    type: String,
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Reminder', Reminderschema);
