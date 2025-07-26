const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
  },
  type: {
    type: String,
    required: true,
    enum: ['message', 'alert', 'request', 'info'], // you can customize types as needed
  },
  status: {
    type: String,
    required: true,
    enum: ['unread', 'read'], // adjust based on your logic
    default: 'unread',
  },
  description: {
    type: String,
    required: true,
  },
  datetime: {
    type: Date,
    default: Date.now,
  },
  body:{
    type: String,
  },
  fcm_token: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema, 'Notification');
