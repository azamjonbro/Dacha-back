const { Router } = require("express");
const statsController = require("../controllers/stats.controller");

const router = Router();

// Stats endpoints
router.get("/overview", statsController.getOverview);
router.get("/revenue", statsController.getRevenue);
router.get("/dacha-usage", statsController.getDachaUsage);
router.get("/occupancy", statsController.getOccupancy);

module.exports = router;
