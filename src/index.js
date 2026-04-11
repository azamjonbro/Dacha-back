// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected"));

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/dacha", require("./routes/dacha.routes"));
app.use("/api/booking", require("./routes/booking.routes"));
app.use("/api/stats", require("./routes/stats.routes"));
app.use("/api/public", require("./routes/public.routes"));

app.listen(process.env.PORT || 4000, () => console.log("Server running"));
