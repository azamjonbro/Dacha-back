// routes/booking.routes.js
const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const c = require("../controllers/booking.controller");

router.use(auth, role("admin", "superadmin"));
router.post("/", c.createBooking);
router.put("/:id", c.updateBooking);
router.get("/", c.getBookings);
router.delete("/:id",c.deleteBooking)

module.exports = router;
