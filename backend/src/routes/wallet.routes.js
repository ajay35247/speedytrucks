const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/payment.controller");
const { protect } = require("../middlewares/auth.middleware");
router.get("/", protect, ctrl.getWallet);
router.post("/withdraw", protect, ctrl.withdrawWallet);
module.exports = router;