const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const c = require("../controllers/dacha.controller");

router.use(auth, role("admin"||"superadmin"));
router.post("/", c.createDacha);
router.put("/:id", c.updateDacha);
router.get("/", c.getAllDachas);

module.exports = router;