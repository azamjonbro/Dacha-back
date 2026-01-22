const axios = require("axios");
require("dotenv").config()
const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHANNEL_ID = process.env.TG_CHANNEL_ID;

async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  await axios.post(url, {
    chat_id: CHANNEL_ID,
    text,
    parse_mode: "HTML"
  });
}

module.exports = {
  sendTelegramMessage
};
