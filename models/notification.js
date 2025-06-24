const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receiver_cnic: {
    type: String,
    required: true,
  },
  sender_cnic: {
    type: String,
    required: true,
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
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema, 'Notification');
