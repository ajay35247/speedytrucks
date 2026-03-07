/**
 * Notification Service — SMS, Email, Push, WhatsApp
 */
const Notification = require("../models/Notification.model");
const { sendEmail } = require("./email.service");

// ── Create and dispatch notification ────────────────────────────
exports.notify = async ({ userId, type, title, body, data = {}, channels = ["push"] }) => {
  try {
    const notification = await Notification.create({
      user: userId, type, title, body, data, channels,
    });

    // Send via channels
    await Promise.allSettled([
      channels.includes("push") && sendPushNotification(userId, title, body, data),
      channels.includes("email") && data.email && sendEmail({ to: data.email, subject: title, html: `<p>${body}</p>` }),
      channels.includes("sms") && data.phone && sendSMS(data.phone, body),
    ].filter(Boolean));

    await Notification.findByIdAndUpdate(notification._id, { sent: true, sentAt: new Date() });
    return notification;
  } catch (err) {
    console.error("[Notification] Error:", err.message);
  }
};

// ── Push notification (FCM or placeholder) ──────────────────────
const sendPushNotification = async (userId, title, body, data) => {
  // Integrate with FCM: firebase-admin sendToDevice
  // For now, socket.io handles real-time delivery
  // FCM integration requires device tokens stored in User model
  if (process.env.FCM_SERVER_KEY) {
    // FCM integration placeholder
  }
};

// ── SMS via Twilio ───────────────────────────────────────────────
const sendSMS = async (phone, message) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) return;
    const twilio = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone.startsWith("+") ? phone : `+91${phone}`,
    });
  } catch (err) {
    console.error("[SMS] Error:", err.message);
  }
};

// ── WhatsApp via Twilio ──────────────────────────────────────────
exports.sendWhatsApp = async (phone, message) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) return;
    const twilio = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:+91${phone}`,
    });
  } catch (err) {
    console.error("[WhatsApp] Error:", err.message);
  }
};

// ── Pre-built notification templates ────────────────────────────
exports.notifyLoadPosted = (driverIds, load) =>
  Promise.all(driverIds.map(id => exports.notify({
    userId: id,
    type: "load_posted",
    title: "New Load Available 🚛",
    body: `${load.pickup?.city} → ${load.delivery?.city} | ₹${load.budget}`,
    data: { loadId: load._id },
    channels: ["push"],
  })));

exports.notifyBidAccepted = (driverId, load) =>
  exports.notify({
    userId: driverId,
    type: "bid_accepted",
    title: "Your Bid Was Accepted! 🎉",
    body: `Congratulations! Your bid for ${load.pickup?.city} → ${load.delivery?.city} was accepted.`,
    data: { loadId: load._id },
    channels: ["push", "sms"],
  });

exports.notifyPaymentDone = (userId, amount) =>
  exports.notify({
    userId,
    type: "payment_completed",
    title: "Payment Received ₹" + amount,
    body: `₹${amount} has been credited to your wallet.`,
    data: {},
    channels: ["push", "sms"],
  });

exports.notifyDelivery = (shipperId, bookingId) =>
  exports.notify({
    userId: shipperId,
    type: "delivery_completed",
    title: "Delivery Completed ✅",
    body: "Your shipment has been delivered successfully!",
    data: { bookingId },
    channels: ["push", "sms"],
  });
