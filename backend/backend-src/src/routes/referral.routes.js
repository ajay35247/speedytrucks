const router = require("express").Router();
const { authenticate } = require("../middlewares/auth.middleware");
const c = require("../controllers/referral.controller");

router.use(authenticate);
router.get("/my", c.getMyReferral);
router.post("/apply", c.applyReferral);
router.get("/leaderboard", c.getLeaderboard);

module.exports = router;
