const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const bookingController = require("../src/controllers/booking.controller");
const Booking = require("../src/models/Booking.model");
const Dacha = require("../src/models/Dacha.model");
const telegram = require("../src/utils/telegram");

// Mock Models and Utils
jest.mock("../src/models/Booking.model");
jest.mock("../src/models/Dacha.model");
jest.mock("../src/utils/telegram", () => ({
  sendTelegramMessage: jest.fn()
}));

// Setup an Express App specifically for testing
const app = express();
app.use(express.json());

// Mock Middlewares to control Auth Behavior easily in tests
const mockAuth = (req, res, next) => {
  if (req.headers["x-mock-role"] === "admin") {
    req.user = { id: "adminUserId", role: "admin" };
    next();
  } else if (req.headers["x-mock-role"] === "user") {
    req.user = { id: "normalUserId", role: "user" };
    next();
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const mockRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

const router = express.Router();
router.use(mockAuth, mockRole("admin", "superadmin"));
router.post("/", bookingController.createBooking);
router.put("/:id", bookingController.updateBooking);
router.get("/", bookingController.getBookings);
router.delete("/:id", bookingController.deleteBooking);

app.use("/api/bookings", router);

describe("Booking API Comprehensive Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const validBookingData = {
    dachaId: new mongoose.Types.ObjectId().toString(),
    startDate: new Date("2026-06-01").toISOString(),
    endDate: new Date("2026-06-05").toISOString(),
    totalPrice: 500,
    avans: 100,
    phone1: "+998901234567"
  };

  const id = new mongoose.Types.ObjectId().toString();

  // Test Case 1: Create booking successfully
  it("should create a booking successfully (201)", async () => {
    Dacha.findOne.mockResolvedValue({ _id: validBookingData.dachaId, adminId: "adminUserId" });
    Booking.findOne.mockResolvedValue(null); // No conflict
    Booking.create.mockResolvedValue({ _id: id, ...validBookingData });

    const res = await request(app)
      .post("/api/bookings")
      .set("x-mock-role", "admin")
      .send(validBookingData);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Booking muvaffaqiyatli yaratildi");
    expect(telegram.sendTelegramMessage).toHaveBeenCalled();
  });

  // Test Case 2 & 3: Prevent double booking and overlapping bookings
  it("should prevent double booking for same date range or overlapping dates (409)", async () => {
    Dacha.findOne.mockResolvedValue({ _id: validBookingData.dachaId, adminId: "adminUserId" });
    Booking.findOne.mockResolvedValue({ _id: "conflictId", startDate: new Date("2026-05-30"), endDate: new Date("2026-06-02") });

    const res = await request(app)
      .post("/api/bookings")
      .set("x-mock-role", "admin")
      .send({
        dachaId: validBookingData.dachaId,
        startDate: "2026-06-01",
        endDate: "2026-06-05"
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Bu sanalar oralig‘ida dacha band");
  });

  // Test Case 4: Reject invalid date formats
  it("should reject invalid date formats (400)", async () => {
    Dacha.findOne.mockResolvedValue({ _id: validBookingData.dachaId, adminId: "adminUserId" });

    const res = await request(app)
      .post("/api/bookings")
      .set("x-mock-role", "admin")
      .send({
        dachaId: validBookingData.dachaId,
        startDate: "2026-06-05", // startDate is greater than endDate
        endDate: "2026-06-01"
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("startDate endDate dan katta bo‘lishi mumkin emas");
  });

  // Test Case 5: Reject missing fields
  it("should reject missing required fields (400)", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("x-mock-role", "admin")
      .send({
        startDate: "2026-06-01",
        // missing dachaId and endDate
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("dachaId, startDate va endDate majburiy");
  });

  // Test Case 6: Reject non-admin users
  it("should reject non-admin users (403)", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("x-mock-role", "user") // normal user
      .send(validBookingData);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Forbidden");
  });

  // Test Case 7: Update booking correctly
  it("should update a booking correctly (200)", async () => {
    const mockBooking = {
      _id: id,
      dachaId: validBookingData.dachaId,
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-05"),
      save: jest.fn()
    };
    
    // Check if Booking exists
    Booking.findById.mockResolvedValue(mockBooking);
    // Check if Dacha belongs to admin
    Dacha.findOne.mockResolvedValue({ _id: validBookingData.dachaId, adminId: "adminUserId" });
    // Make sure no conflict
    Booking.findOne.mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/bookings/${id}`)
      .set("x-mock-role", "admin")
      .send({
        startDate: "2026-07-01",
        endDate: "2026-07-05",
        totalPrice: 600
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Booking muvaffaqiyatli yangilandi");
    expect(mockBooking.save).toHaveBeenCalled();
  });

  // Test Case 8: Delete booking correctly (soft delete)
  it("should deactivate (soft delete) a booking correctly (200)", async () => {
    const mockBooking = {
      _id: id,
      dachaId: validBookingData.dachaId,
      isActive: true,
      save: jest.fn()
    };

    Booking.findById.mockResolvedValue(mockBooking);
    Dacha.findOne.mockResolvedValue({ _id: validBookingData.dachaId, adminId: "adminUserId" });

    const res = await request(app)
      .delete(`/api/bookings/${id}`)
      .set("x-mock-role", "admin");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Band muvaffaqiyatli bekor qilindi");
    expect(mockBooking.isActive).toBe(false);
    expect(mockBooking.save).toHaveBeenCalled();
  });

  // Test Case 9: Handle concurrent booking requests
  it("should handle concurrent booking requests properly (Simulated)", async () => {
    // In unit testing with mocked models, simulating race conditions requires tweaking how mock resolves.
    // We simulate that the DB checks `Booking.findOne` cleanly, and one request gets blocked.
    Dacha.findOne.mockResolvedValue({ _id: validBookingData.dachaId, adminId: "adminUserId" });

    // First request checks conflict (finds null)
    // Second request checks conflict (finds null initially)
    // To simulate race condition accurately, we can dispatch two requests,
    // though actual Mongoose logic dictates race conditioning. Here, we'll return a conflict for the second.
    
    Booking.findOne
      .mockResolvedValueOnce(null) // Request 1: No conflict
      .mockResolvedValueOnce({ _id: "conflictId" }); // Request 2: DB found conflict based on locks

    Booking.create.mockResolvedValue({ _id: id, ...validBookingData });

    const req1 = request(app)
      .post("/api/bookings")
      .set("x-mock-role", "admin")
      .send(validBookingData);

    const req2 = request(app)
      .post("/api/bookings")
      .set("x-mock-role", "admin")
      .send(validBookingData);

    const [res1, res2] = await Promise.all([req1, req2]);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(409); // Second one fails
  });
});
