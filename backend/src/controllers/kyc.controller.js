/**
 * KYC Controller — document upload and status management
 */
const cloudinary = require("cloudinary").v2;
const KYC = require("../models/KYC.model");
const User = require("../models/User.model");
const { log } = require("../services/audit.service");
const { sendSuccess, sendError } = require("../utils/response");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── UPLOAD DOCUMENT ───────────────────────────────────────────
exports.uploadDocument = async (req, res, next) => {
  try {
    const { docType } = req.params; // pan | drivingLicense | rc | gst | aadhaar | selfie
    const validDocs = ["pan", "drivingLicense", "rc", "gst", "aadhaar", "selfie"];
    if (!validDocs.includes(docType)) return sendError(res, 400, "Invalid document type.");
    if (!req.file) return sendError(res, 400, "No file uploaded.");

    // Upload to Cloudinary in secure KYC folder
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `speedytrucks/kyc/${req.user._id}`, resource_type: "auto", format: "jpg" },
        (err, result) => err ? reject(err) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    // Upsert KYC record
    let kyc = await KYC.findOne({ user: req.user._id });
    if (!kyc) kyc = new KYC({ user: req.user._id });

    kyc[docType] = { url: result.secure_url, status: "pending" };
    kyc.overallStatus = "pending";
    kyc.submittedAt = new Date();
    await kyc.save();

    await User.findByIdAndUpdate(req.user._id, { kycStatus: "pending" });

    await log({ userId: req.user._id, action: "KYC_UPLOAD", detail: `Uploaded ${docType}` });
    sendSuccess(res, 200, `${docType} uploaded successfully.`, { url: result.secure_url, docType });
  } catch (err) { next(err); }
};

// ── GET KYC STATUS ────────────────────────────────────────────
exports.getKYCStatus = async (req, res, next) => {
  try {
    const kyc = await KYC.findOne({ user: req.user._id }).select("-__v");
    if (!kyc) return sendSuccess(res, 200, "No KYC submitted yet.", { kyc: null });
    sendSuccess(res, 200, "KYC status fetched.", { kyc });
  } catch (err) { next(err); }
};

// ── GET ALL PENDING KYCs (Admin) ───────────────────────────────
exports.getPendingKYCs = async (req, res, next) => {
  try {
    const kycs = await KYC.find({ overallStatus: "pending" })
      .populate("user", "name email phone role company")
      .sort({ submittedAt: 1 }); // oldest first
    sendSuccess(res, 200, "Pending KYCs.", { kycs, total: kycs.length });
  } catch (err) { next(err); }
};