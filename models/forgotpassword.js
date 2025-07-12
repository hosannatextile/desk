const mongoose = require('mongoose');

const forgotpasswordSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  reason: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Optional: use default pluralized lowercase collection name
module.exports = mongoose.model('Forgotpassword', forgotpasswordSchema);