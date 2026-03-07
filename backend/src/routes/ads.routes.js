const router = require("express").Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const c = require("../controllers/ads.controller");

router.get("/active", c.getActiveAds);
router.post("/:adId/click", c.recordClick);
router.use(authenticate);
router.post("/", c.createCampaign);
router.get("/my", c.getMyCampaigns);
// Admin routes
router.get("/admin/all", authorize("admin"), c.getAllCampaigns);
router.patch("/admin/:id/review", authorize("admin"), c.reviewCampaign);

module.exports = router;
