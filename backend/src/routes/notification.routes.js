const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const Notification = require("../models/Notification.model");
const { sendSuccess } = require("../utils/response");

router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [notifications, unread] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    sendSuccess(res, 200, "Notifications", { notifications, unread });
  } catch (err) { next(err); }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true, readAt: new Date() }
    );
    sendSuccess(res, 200, "Marked as read", {});
  } catch (err) { next(err); }
});

router.patch("/read-all", async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );
    sendSuccess(res, 200, "All notifications marked as read", {});
  } catch (err) { next(err); }
});

module.exports = router;
