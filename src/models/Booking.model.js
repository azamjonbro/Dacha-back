const { Schema, model } = require("mongoose");

const bookingSchema = new Schema({
  dachaId: {
    type: Schema.Types.ObjectId,
    ref: "Dacha",
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  prepayment: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'finished', 'cancelled'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

module.exports = model("Booking", bookingSchema);

