/**
 * Payment Routes
 */
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/payment.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/create-order",    protect, ctrl.createPaymentOrder);
router.post("/verify",          protect, ctrl.verifyPaymentCallback);
router.get("/wallet",           protect, ctrl.getWallet);
router.post("/wallet/withdraw", protect, ctrl.withdrawWallet);

module.exports = router;