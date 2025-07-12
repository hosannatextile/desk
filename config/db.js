const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://tabish_31:7cXVLESKNt5MLLsk@deskhelp.gri6dmp.mongodb.net/?retryWrites=true&w=majority&appName=Deskhelp';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};


module.exports = connectDB;
