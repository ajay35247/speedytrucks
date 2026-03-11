import mongoose from 'mongoose';

const walletTxSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['credit','debit'], required: true },
  amount:    { type: Number, required: true },
  reason:    { type: String, required: true },
  reference: { type: String },
  balance:   { type: Number },
}, { timestamps: true });

export default mongoose.model('WalletTransaction', walletTxSchema);
