import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
  load:       { type: mongoose.Schema.Types.ObjectId, ref: 'FreightLoad', required: true },
  bidder:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:     { type: Number, required: true },
  note:       { type: String, default: '' },
  status:     { type: String, enum: ['pending','accepted','rejected','withdrawn'], default: 'pending' },
  acceptedAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('Bid', bidSchema);
