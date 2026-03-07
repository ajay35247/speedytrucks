const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, trim: true, maxlength: 2000 },
  type: { type: String, enum: ["text", "image", "location", "file"], default: "text" },
  metadata: {
    fileUrl: String,
    fileName: String,
    lat: Number,
    lng: Number,
    address: String,
  },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  load: { type: mongoose.Schema.Types.ObjectId, ref: "FreightLoad" },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  lastActivity: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

exports.Message = mongoose.model("Message", messageSchema);
exports.Conversation = mongoose.model("Conversation", conversationSchema);
