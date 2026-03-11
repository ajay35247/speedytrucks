import FreightLoad from '../models/FreightLoad.model.js';
import { ok, err } from '../utils/response.js';

export const getLoads = async (req, res, next) => {
  try {
    const { from, to, truckType, status = 'active', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (from)      filter.from = new RegExp(from, 'i');
    if (to)        filter.to   = new RegExp(to, 'i');
    if (truckType) filter.truckType = truckType;
    if (status)    filter.status = status;

    const loads = await FreightLoad.find(filter)
      .populate('postedBy', 'name company')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await FreightLoad.countDocuments(filter);
    return ok(res, { loads, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
};

export const getMyLoads = async (req, res, next) => {
  try {
    const loads = await FreightLoad.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
    return ok(res, { loads });
  } catch (e) { next(e); }
};

export const createLoad = async (req, res, next) => {
  try {
    const { from, to, weight, truckType, description, budget, pickupDate } = req.body;
    if (!from || !to || !weight) return err(res, 'from, to, and weight are required', 400);
    const load = await FreightLoad.create({ postedBy: req.user._id, from, to, weight, truckType, description, budget, pickupDate });
    await load.populate('postedBy', 'name company');
    return ok(res, { load }, 'Load posted', 201);
  } catch (e) { next(e); }
};

export const updateLoad = async (req, res, next) => {
  try {
    const load = await FreightLoad.findOne({ _id: req.params.id, postedBy: req.user._id });
    if (!load) return err(res, 'Load not found', 404);
    Object.assign(load, req.body);
    await load.save();
    return ok(res, { load }, 'Load updated');
  } catch (e) { next(e); }
};

export const deleteLoad = async (req, res, next) => {
  try {
    const load = await FreightLoad.findOneAndUpdate({ _id: req.params.id, postedBy: req.user._id }, { status: 'cancelled' }, { new: true });
    if (!load) return err(res, 'Load not found', 404);
    return ok(res, {}, 'Load cancelled');
  } catch (e) { next(e); }
};
