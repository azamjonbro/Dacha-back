// routes/booking.routes.js
const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const c = require("../controllers/booking.controller");

router.use(auth, role("admin", "superadmin"));
router.post("/", c.createBooking);
router.put("/:id", c.updateBooking);
router.get("/", c.getBookings);
router.get("/history", c.getBookingHistory);
router.delete("/:id", c.deleteBooking);

router.put("/:id/approve", c.approveBooking);
router.delete("/:id/decline", c.declineBooking);
router.get("/pending", c.getPendingBookings);

module.exports = router;
