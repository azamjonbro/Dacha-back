const { Router } = require("express");
const statsController = require("../controllers/stats.controller");
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");

const router = Router();

// Stats endpoints - All protected for admins
router.use(auth, role("admin", "superadmin"));

router.get("/overview", statsController.getOverview);
router.get("/revenue", statsController.getRevenue);
router.get("/dacha-usage", statsController.getDachaUsage);
router.get("/occupancy", statsController.getOccupancy);

module.exports = router;
