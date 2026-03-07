/**
 * Payment Controller — Razorpay orders, webhooks, wallet
 */
const { createOrder, verifyPayment, creditWallet, debitWallet } = require("../services/payment.service");
const WalletTransaction = require("../models/WalletTransaction.model");
const FreightLoad = require("../models/FreightLoad.model");
const { log } = require("../services/audit.service");
const { sendSuccess, sendError } = require("../utils/response");
const User = require("../models/User.model");

// ── CREATE PAYMENT ORDER ──────────────────────────────────────
exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { loadId } = req.body;
    const load = await FreightLoad.findById(loadId).populate("shipper assignedTo");
    if (!load) return sendError(res, 404, "Load not found.");
    if (load.shipper._id.toString() !== req.user._id.toString()) return sendError(res, 403, "Not authorized.");
    if (load.paymentStatus !== "pending") return sendError(res, 400, "Payment already processed.");

    const totalAmount = load.finalRate + load.commission;
    const order = await createOrder(totalAmount, { loadId, shipperId: req.user._id });

    await FreightLoad.findByIdAndUpdate(loadId, { razorpayOrderId: order.id });

    sendSuccess(res, 200, "Payment order created.", {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) { next(err); }
};

// ── VERIFY PAYMENT (Razorpay callback) ────────────────────────
exports.verifyPaymentCallback = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, loadId } = req.body;
    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) return sendError(res, 400, "Payment verification failed. Invalid signature.");

    const load = await FreightLoad.findById(loadId);
    if (!load) return sendError(res, 404, "Load not found.");

    const commission = load.commission;
    const ownerAmount = load.finalRate - commission;

    // Credit truck owner wallet
    await creditWallet(load.assignedTo, ownerAmount, `Payment for load ${loadId}`, razorpay_payment_id, "payment");

    // Update load payment status
    await FreightLoad.findByIdAndUpdate(loadId, { paymentStatus: "paid" });

    await log({ userId: req.user._id, action: "PAYMENT_SUCCESS", resourceId: loadId, detail: `₹${load.finalRate} paid` });
    sendSuccess(res, 200, "Payment verified and processed.", { paymentId: razorpay_payment_id });
  } catch (err) { next(err); }
};

// ── GET WALLET ─────────────────────────────────────────────────
exports.getWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("walletBalance");
    const transactions = await WalletTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    sendSuccess(res, 200, "Wallet fetched.", { balance: user.walletBalance, transactions });
  } catch (err) { next(err); }
};

// ── WITHDRAW (UPI payout placeholder) ─────────────────────────
exports.withdrawWallet = async (req, res, next) => {
  try {
    const { amount, upiId } = req.body;
    if (amount < 100) return sendError(res, 400, "Minimum withdrawal is ₹100.");

    await debitWallet(req.user._id, amount, `Withdrawal to UPI ${upiId}`, `WD_${Date.now()}`, "withdrawal");

    await log({ userId: req.user._id, action: "WALLET_WITHDRAWAL", detail: `₹${amount} to ${upiId}` });
    sendSuccess(res, 200, "Withdrawal initiated. Funds will be credited in 1-2 business days.");
  } catch (err) { next(err); }
};