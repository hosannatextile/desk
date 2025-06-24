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
    type: String, // store image URL or file path
    required: false,
  },
  department: {
    type: String,
    required: true,
    enum: ['HR', 'Finance', 'IT', 'Management', 'Admin', 'Operations'], // adjust as needed
  },
  role: {
    type: String,
    required: true,
    enum: ['Incharge', 'Supervisor', 'Super Admin', 'IT', 'Management'],
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
  status:{
    type:String,
    required: true,
    enum: ['active','inactive']
  }
}, { timestamps: true });

module.exports = mongoose.model('User_detail', userSchema, 'User');
