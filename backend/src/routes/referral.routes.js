const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const c = require("../controllers/referral.controller");

router.use(protect);
router.get("/my", c.getMyReferral);
router.post("/apply", c.applyReferral);
router.get("/leaderboard", c.getLeaderboard);

module.exports = router;
