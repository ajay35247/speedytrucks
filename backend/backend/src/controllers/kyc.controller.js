import KYC from '../models/KYC.model.js';
import User from '../models/User.model.js';
import { ok, err } from '../utils/response.js';

export const getStatus = async (req, res, next) => {
  try {
    let kyc = await KYC.findOne({ user: req.user._id });
    if (!kyc) kyc = { status: 'not_started', documents: {} };
    return ok(res, { ...kyc.toObject?.() || kyc });
  } catch (e) { next(e); }
};

export const uploadDocument = async (req, res, next) => {
  try {
    const { docType } = req.params;
    const allowed = ['aadhaar', 'pan', 'license', 'rc'];
    if (!allowed.includes(docType)) return err(res, 'Invalid document type', 400);
    if (!req.file) return err(res, 'No file uploaded', 400);

    const url = req.file.path || req.file.secure_url || '';
    let kyc = await KYC.findOne({ user: req.user._id });
    if (!kyc) kyc = new KYC({ user: req.user._id });

    kyc.documents = kyc.documents || {};
    kyc.documents[docType] = { url, status: 'pending' };
    if (kyc.status === 'not_started') kyc.status = 'pending';
    await kyc.save();

    await User.findByIdAndUpdate(req.user._id, { kycStatus: 'pending' });
    return ok(res, { kyc }, 'Document uploaded successfully');
  } catch (e) { next(e); }
};
