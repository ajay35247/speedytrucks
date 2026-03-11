import mongoose from 'mongoose';

const kycSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status:    { type: String, enum: ['not_started','pending','approved','rejected'], default: 'not_started' },
  documents: {
    aadhaar:  { url: String, status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' } },
    pan:      { url: String, status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' } },
    license:  { url: String, status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' } },
    rc:       { url: String, status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' } },
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  remarks:    { type: String },
}, { timestamps: true });

export default mongoose.model('KYC', kycSchema);
