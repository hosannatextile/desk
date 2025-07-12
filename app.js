const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); 
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const loginroutes= require('./routes/loginRoutes')
const notification = require('./routes/notificationRoutes');
const tickets = require('./routes/ticketRoutes');
const proof = require('./routes/proofRoutes');
const workinstruction = require('./routes/workinstructionRouter');
const management_wi= require('./routes/management_wi_routes')
const forgotpass = require('./routes/forgotpasswordRoutes')
const assign= require('./routes/assignRoutes')
// const admin = require('../firebase'); // Firebase initialized
const ticketresponse = require('./routes/ticketresponseroutes')
const path = require('path');
dotenv.config();
connectDB();

const app = express();
app.use(cors());  // Enable CORS for all routes
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/login', loginroutes);
app.use('/api/notification', notification);
app.use('/api/ticket', tickets);
app.use('/api/proof', proof);
app.use('/api/workinstruction', workinstruction);
app.use('/api/management_wi', management_wi);
app.use('/api/forgotpass', forgotpass);
app.use('/api/assign', assign);
app.use('/api/ticketResponse', ticketresponse);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/users_data', express.static(path.join(__dirname, 'users_data')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
