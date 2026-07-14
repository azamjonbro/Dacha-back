require("dotenv").config();

module.exports = {
  email: process.env.ESKIZ_EMAIL,
  password: process.env.ESKIZ_PASSWORD,
  from: process.env.ESKIZ_FROM || "4546",
  baseUrl: process.env.ESKIZ_BASE_URL || "https://notify.eskiz.uz/api"
};
