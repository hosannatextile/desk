const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const loginroutes= require('./routes/loginRoutes')
const notification = require('./routes/notificationRoutes');
const tickets = require('./routes/ticketRoutes');
const proof = require('./routes/proofRoutes');
const workinstruction = require('./routes/workinstructionRouter');
const management_wi= require('./routes/management_wi_routes')
dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/login', loginroutes);
app.use('/api/notification', notification);
app.use('/api/ticket', tickets);
app.use('/api/proof', proof);
app.use('/api/workinstruction', workinstruction);
app.use('/api/management_wi', management_wi);

app.get('/ping', (req, res) => {
  res.send('Server is alive!');
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
