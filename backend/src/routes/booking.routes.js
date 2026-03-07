const router = require("express").Router();
const { authenticate } = require("../middlewares/auth.middleware");
const c = require("../controllers/booking.controller");

router.use(authenticate);
router.get("/", c.getMyBookings);
router.get("/:id", c.getBooking);
router.patch("/:id/status", c.updateStatus);
router.post("/:id/verify-otp", c.verifyOTP);
router.post("/:id/review", c.submitReview);

module.exports = router;
