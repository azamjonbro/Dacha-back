// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected"));

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/dacha", require("./routes/dacha.routes"));
app.use("/api/booking", require("./routes/booking.routes"));

app.listen(process.env.PORT || 4000, () => console.log("Server running"));
