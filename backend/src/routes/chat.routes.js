const router = require("express").Router();
const { authenticate } = require("../middlewares/auth.middleware");
const c = require("../controllers/chat.controller");

router.use(authenticate);
router.post("/conversations", c.getOrCreateConversation);
router.get("/conversations", c.getMyConversations);
router.get("/conversations/:conversationId/messages", c.getMessages);

module.exports = router;
