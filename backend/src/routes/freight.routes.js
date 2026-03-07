/**
 * Freight Routes
 */
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/freight.controller");
const { protect, authorize, requireKYC } = require("../middlewares/auth.middleware");

router.get("/",           protect, ctrl.getLoads);
router.get("/my",         protect, ctrl.myLoads);
router.get("/:id",        protect, ctrl.getLoad);
router.post("/",          protect, authorize("shipper", "admin"), requireKYC, ctrl.postLoad);
router.put("/:id",        protect, ctrl.updateLoad);
router.delete("/:id",     protect, ctrl.cancelLoad);

module.exports = router;