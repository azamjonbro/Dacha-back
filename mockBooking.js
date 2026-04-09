// const mongoose = require("mongoose");
// const Booking = require("./src/models/Booking.model");
// const Dacha = require("./src/models/Dacha.model");

// mongoose.connect("mongodb://AzamjonbroEngineer:EngineV8Coder%26Developer@37.252.20.41:27017/dachabor?authSource=admin").then(async () => {
//     // Find first dacha
//     const dacha = await Dacha.findOne({});
//     if(!dacha) return process.exit(0);
    
//     await Booking.create({
//         dachaId: dacha._id,
//         startDate: new Date(),
//         endDate: new Date(Date.now() + 86400000),
//         name: "Test Mijoz",
//         phone: "+998901234567",
//         totalPrice: 0,
//         prepayment: 0,
//         isActive: true,
//         status: 'pending' 
//     });
    
//     console.log("Mock pending booking (request) created!");
//     process.exit(0);
// });

