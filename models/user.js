const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
  },
  cnic: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  profilePhoto: {
    type: String,
    required: false,
  },
  department: {
    type: String,
    required: true,
    enum: ['HR', 'Finance', 'IT', 'Management', 'Admin', 'Operations','Folding','Dispatch','Gate','Jigger','Maintainance','Shade Band','Store','Electrical','Finishing','Accounts','Greigh'],
  },
  role: {
    type: String,
    required: true,
    enum: ['Incharge', 'Supervisor', 'Super Admin', 'IT', 'Management', 'Admin'],
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive'],
  },
  lastSeen: {
    type: Date,
    default: null,
  },
  fcm_token: {
    type: String,
    default: null,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema, 'User');
