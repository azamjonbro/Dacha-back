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
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = model("Dacha", dachaSchema);
