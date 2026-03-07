const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: {
    type: String,
    enum: ["load_posted","bid_placed","bid_accepted","booking_confirmed","driver_arrived",
           "payment_completed","delivery_completed","kyc_approved","kyc_rejected",
           "referral_reward","system","fraud_alert"],
    required: true
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  channels: [{ type: String, enum: ["push","email","sms","whatsapp"] }],
  read: { type: Boolean, default: false },
  readAt: Date,
  sent: { type: Boolean, default: false },
  sentAt: Date,
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
