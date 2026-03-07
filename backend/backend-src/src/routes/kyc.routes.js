/**
 * KYC Routes
 */
const express = require("express");
const multer = require("multer");
const router = express.Router();
const ctrl = require("../controllers/kyc.controller");
const { protect } = require("../middlewares/auth.middleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, and PDF files are allowed."));
  },
});

router.get("/status",              protect, ctrl.getKYCStatus);
router.post("/upload/:docType",    protect, upload.single("document"), ctrl.uploadDocument);

module.exports = router;