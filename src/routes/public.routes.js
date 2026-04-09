const express = require("express");
const router = express.Router();
const c = require("../controllers/public.controller");

router.get("/dachas", c.getPublicDachas);
router.post("/booking", c.createGuestBooking);

module.exports = router;
