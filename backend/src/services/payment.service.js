/**
 * Payment Service — Razorpay integration for freight payments
 */
const Razorpay = require("razorpay");
const WalletTransaction = require("../models/WalletTransaction.model");
const User = require("../models/User.model");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * createOrder — create Razorpay order for freight payment
 */
const createOrder = async (amountINR, notes = {}) => {
  return razorpay.orders.create({
    amount: amountINR * 100,  // Razorpay expects paise
    currency: "INR",
    notes,
  });
};

/**
 * verifyPayment — verify Razorpay webhook signature
 */
const verifyPayment = (orderId, paymentId, signature) => {
  const crypto = require("crypto");
  const expectedSig = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expectedSig === signature;
};

/**
 * creditWallet — add funds to user wallet
 */
const creditWallet = async (userId, amount, description, referenceId, category = "payment") => {
  const user = await User.findById(userId);
  const balanceBefore = user.walletBalance;
  user.walletBalance += amount;
  await user.save();
  await WalletTransaction.create({
    user: userId, type: "credit", amount, balanceBefore,
    balanceAfter: user.walletBalance, description, referenceId, category,
  });
  return user.walletBalance;
};

/**
 * debitWallet — deduct from user wallet
 */
const debitWallet = async (userId, amount, description, referenceId, category = "payment") => {
  const user = await User.findById(userId);
  if (user.walletBalance < amount) throw new Error("Insufficient wallet balance.");
  const balanceBefore = user.walletBalance;
  user.walletBalance -= amount;
  await user.save();
  await WalletTransaction.create({
    user: userId, type: "debit", amount, balanceBefore,
    balanceAfter: user.walletBalance, description, referenceId, category,
  });
  return user.walletBalance;
};

module.exports = { createOrder, verifyPayment, creditWallet, debitWallet };