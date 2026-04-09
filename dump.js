const mongoose = require("mongoose");
const Booking = require("./src/models/Booking.model");

mongoose.connect("mongodb://AzamjonbroEngineer:EngineV8Coder%26Developer@37.252.20.41:27017/dachabor?authSource=admin").then(async () => {
    const bookings = await Booking.find({ status: "pending" });
    console.log("PENDING BOOKINGS: " + bookings.length);
    bookings.forEach(b => {
       console.log(`- ID: ${b._id}, status: ${b.status}, active: ${b.isActive}, user: ${b.OrderedUser}, phone: ${b.phone1}`);
    });
    process.exit(0);
});
