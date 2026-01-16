const { Schema, model } = require("mongoose");

const bookingSchema = new Schema({
  dachaId: {
    type: Schema.Types.ObjectId,
    ref: "Dacha",
    required: true
  },
  startDate: Date,
  endDate: Date,
  OrderedUser: String,

  totalPrice: Number,
  avans: Number,

  phone1: String,
  phone2: String,

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
   isActive: {
      type: Boolean,
      default: true,
      index: true
    }
}, { timestamps: true });

module.exports = model("Booking", bookingSchema);
