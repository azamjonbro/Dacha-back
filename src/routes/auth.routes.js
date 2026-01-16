const router = require("express").Router();
const {login} = require("../controllers/auth.controller");
const {createAdmin,getAllAdmins }= require("../controllers/superadmin.controller")

// POST /api/auth/login
router.post("/login", login);
router.post("/create", createAdmin);
router.get("/admins", getAllAdmins);
module.exports = router;
