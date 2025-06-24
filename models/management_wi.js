const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const management_wiSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  proof_media: {
    type:String,
    enum:['audio','video','voice']
  },
  type:{
    type:String
  },
  remarks:{
   type:String
  },
  saved_time: {
    type: Date,
    default: Date.now
  },
  review_time: {
    type: String,
    enum: ['daily', 'weekly', 'monthly','onetime'],
    required: true
  },
  order_type:{
    type:String,
    enum:['strict','follow']
  }
},{ timestamps: true });

module.exports = mongoose.model('management_wiSchema', management_wiSchema);
