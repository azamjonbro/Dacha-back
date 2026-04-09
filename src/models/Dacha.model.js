const { Schema, model } = require("mongoose");

const dachaSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  images: {
    type: [String],
    default: []
  },
  video: {
    type: String,
    default: ""
  },
  features: {
    type: [String],
    default: []
  },
  location: {
    type: String,
    default: ""
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = model("Dacha", dachaSchema);
