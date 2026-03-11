import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:  { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  ip:      { type: String },
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
