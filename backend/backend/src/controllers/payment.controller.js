import crypto from 'crypto';
import User from '../models/User.model.js';
import WalletTransaction from '../models/WalletTransaction.model.js';
import FreightLoad from '../models/FreightLoad.model.js';
import { ok, err } from '../utils/response.js';

const getRazorpay = async () => {
  if (!process.env.RAZORPAY_KEY_ID) throw new Error('Razorpay not configured');
  const Razorpay = (await import('razorpay')).default;
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
};

export const createOrder = async (req, res, next) => {
  try {
    const { amount, loadId } = req.body;
    if (!amount) return err(res, 'Amount required', 400);
    const rz = await getRazorpay();
    const order = await rz.orders.create({ amount: amount * 100, currency: 'INR', receipt: `load_${loadId}_${Date.now()}` });
    return ok(res, { order, key: process.env.RAZORPAY_KEY_ID });
  } catch (e) { return err(res, e.message, 500); }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, loadId, transporterId } = req.body;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) return err(res, 'Invalid payment signature', 400);

    const rz = await getRazorpay();
    const payment = await rz.payments.fetch(razorpay_payment_id);
    const amount = payment.amount / 100;
    const commission = amount * 0.05;
    const earning = amount - commission;

    if (transporterId) {
      const transporter = await User.findById(transporterId);
      if (transporter) {
        transporter.walletBalance = (transporter.walletBalance || 0) + earning;
        await transporter.save();
        await WalletTransaction.create({ user: transporterId, type: 'credit', amount: earning, reason: 'Load payment received', reference: razorpay_payment_id });
      }
    }
    if (loadId) await FreightLoad.findByIdAndUpdate(loadId, { status: 'in_transit' });
    return ok(res, { verified: true, amount });
  } catch (e) { next(e); }
};

export const getWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance');
    const txns = await WalletTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    return ok(res, { balance: user.walletBalance || 0, transactions: txns });
  } catch (e) { next(e); }
};

export const withdrawWallet = async (req, res, next) => {
  try {
    const { amount, upi } = req.body;
    if (!amount || !upi) return err(res, 'Amount and UPI ID required', 400);
    const user = await User.findById(req.user._id);
    if ((user.walletBalance || 0) < amount) return err(res, 'Insufficient balance', 400);
    user.walletBalance -= amount; await user.save();
    await WalletTransaction.create({ user: req.user._id, type: 'debit', amount, reason: `Withdrawal to UPI: ${upi}`, balance: user.walletBalance });
    return ok(res, { balance: user.walletBalance }, 'Withdrawal initiated');
  } catch (e) { next(e); }
};
