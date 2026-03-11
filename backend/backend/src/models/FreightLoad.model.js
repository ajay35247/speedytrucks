import mongoose from 'mongoose';

const freightLoadSchema = new mongoose.Schema({
  postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  from:        { type: String, required: true, trim: true },
  to:          { type: String, required: true, trim: true },
  weight:      { type: Number, required: true },
  truckType:   { type: String, default: 'Open Body' },
  description: { type: String, default: '' },
  budget:      { type: Number },
  status:      { type: String, enum: ['active','assigned','in_transit','completed','cancelled'], default: 'active' },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptedBid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid' },
  pickupDate:  { type: Date },
  deliveryDate:{ type: Date },
}, { timestamps: true });

export default mongoose.model('FreightLoad', freightLoadSchema);
