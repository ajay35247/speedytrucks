/**
 * Bid Routes
 */
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/bid.controller");
const { protect, authorize, requireKYC } = require("../middlewares/auth.middleware");

router.get("/my",              protect, ctrl.myBids);
router.get("/load/:loadId",    protect, ctrl.getLoadBids);
router.post("/",               protect, authorize("owner", "broker"), requireKYC, ctrl.placeBid);
router.patch("/:id/accept",    protect, authorize("shipper", "admin"), ctrl.acceptBid);
router.patch("/:id/withdraw",  protect, ctrl.withdrawBid);

module.exports = router;