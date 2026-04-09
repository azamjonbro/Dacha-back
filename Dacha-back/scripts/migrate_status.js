const mongoose = require("mongoose");
const Booking = require("../src/models/Booking.model");

const MONGO_URI = "mongodb://AzamjonbroEngineer:EngineV8Coder%26Developer@37.252.20.41:27017/dachabor?authSource=admin";

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Move all past confirmed/band bookings to 'finished'
    const finishedResult = await Booking.updateMany(
      {
        status: { $in: ['confirmed', 'band'] },
        endDate: { $lt: today }
      },
      {
        $set: { status: 'finished', isActive: false }
      }
    );
    console.log(`Successfully finished ${finishedResult.modifiedCount} past bookings.`);

    // 2. Standardize 'band' to 'confirmed' for future bookings
    const confirmedResult = await Booking.updateMany(
      {
        status: 'band',
        endDate: { $gte: today }
      },
      {
        $set: { status: 'confirmed' }
      }
    );
    console.log(`Successfully standardized ${confirmedResult.modifiedCount} future 'band' bookings to 'confirmed'.`);

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
