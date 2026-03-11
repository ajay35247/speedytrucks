import Bid from '../models/Bid.model.js';
import FreightLoad from '../models/FreightLoad.model.js';
import { ok, err } from '../utils/response.js';

export const placeBid = async (req, res, next) => {
  try {
    const { loadId, amount, note } = req.body;
    if (!loadId || !amount) return err(res, 'loadId and amount required', 400);
    const load = await FreightLoad.findById(loadId);
    if (!load || load.status !== 'active') return err(res, 'Load not available', 404);
    const existing = await Bid.findOne({ load: loadId, bidder: req.user._id, status: 'pending' });
    if (existing) return err(res, 'You already have a pending bid on this load', 409);
    const bid = await Bid.create({ load: loadId, bidder: req.user._id, amount, note });
    return ok(res, { bid }, 'Bid placed', 201);
  } catch (e) { next(e); }
};

export const getBidsForLoad = async (req, res, next) => {
  try {
    const bids = await Bid.find({ load: req.params.id }).populate('bidder', 'name company kycStatus');
    return ok(res, { bids });
  } catch (e) { next(e); }
};

export const acceptBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id).populate('load');
    if (!bid) return err(res, 'Bid not found', 404);
    if (bid.load.postedBy.toString() !== req.user._id.toString()) return err(res, 'Unauthorized', 403);
    bid.status = 'accepted'; bid.acceptedAt = new Date(); await bid.save();
    await FreightLoad.findByIdAndUpdate(bid.load._id, { status: 'assigned', assignedTo: bid.bidder, acceptedBid: bid._id });
    await Bid.updateMany({ load: bid.load._id, _id: { $ne: bid._id } }, { status: 'rejected' });
    return ok(res, { bid }, 'Bid accepted');
  } catch (e) { next(e); }
};

export const withdrawBid = async (req, res, next) => {
  try {
    const bid = await Bid.findOneAndUpdate({ _id: req.params.id, bidder: req.user._id, status: 'pending' }, { status: 'withdrawn' }, { new: true });
    if (!bid) return err(res, 'Bid not found', 404);
    return ok(res, { bid }, 'Bid withdrawn');
  } catch (e) { next(e); }
};
