const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Booking = require('./src/models/Booking.model');

const dachaIds = [
  '69e5f199136c12c54d81655b', 
  '69e5f1b4136c12c54d81658f', 
  '69e5f1c1136c12c54d816592'
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // Find all bookings for these dachas with totalPrice < 100,000
    // We also target prepayments separately if needed, but usually they go together.
    const bookings = await Booking.find({
      dachaId: { $in: dachaIds },
      totalPrice: { $lt: 100000, $gt: 0 } // gt 0 to avoid scaling 0 values
    });

    console.log(`Found ${bookings.length} bookings to update.`);

    let updatedCount = 0;
    for (const booking of bookings) {
      const oldPrice = booking.totalPrice;
      const oldPrepayment = booking.prepayment;
      
      booking.totalPrice = oldPrice * 1000;
      booking.prepayment = oldPrepayment * 1000;
      
      await booking.save();
      updatedCount++;
      // Optional logging for debugging:
      // console.log(`Updated ${booking.name}: ${oldPrice} -> ${booking.totalPrice}`);
    }

    console.log(`Finished. Updated ${updatedCount} bookings.`);
    process.exit(0);
  } catch (error) {
    console.error("Error during price fix:", error);
    process.exit(1);
  }
}

run();
