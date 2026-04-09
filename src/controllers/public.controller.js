const Booking = require("../models/Booking.model");
const Dacha = require("../models/Dacha.model");
const { sendTelegramMessage } = require("../utils/telegram");

const normalizeDate = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

exports.getPublicDachas = async (req, res) => {
  try {
    const dachas = await Dacha.find({ isActive: true }).select("_id name images video features location");
    
    const dachaIds = dachas.map(d => d._id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = await Booking.find({
      dachaId: { $in: dachaIds },
      status: { $in: ['confirmed', 'band'] },
      endDate: { $gte: today } 
    }).select("startDate endDate dachaId");
    
    // Attach bookings to dachas so the frontend calendar can disable taken dates
    const dachaWithBookings = dachas.map(dacha => {
      const dachaObj = dacha.toObject();
      dachaObj.bookings = bookings.filter(b => b.dachaId.toString() === dacha._id.toString());
      return dachaObj;
    });

    return res.json(dachaWithBookings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server xatosi" });
  }
};

exports.createGuestBooking = async (req, res) => {
  try {
    const { dachaId, startDate, endDate, phone, name } = req.body;

    if (!dachaId || !startDate || !endDate || !phone || !name) {
      return res.status(400).json({ message: "Barcha kerakli maydonlarni to'ldiring" });
    }

    const dacha = await Dacha.findOne({ _id: dachaId, isActive: true });
    if (!dacha) {
      return res.status(404).json({ message: "Dacha topilmadi" });
    }

    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);

    if (start > end) {
      return res.status(400).json({ message: "Sana oralig'i noto'g'ri" });
    }

    const conflict = await Booking.findOne({
      dachaId,
      status: { $in: ['confirmed', 'band'] },
      startDate: { $lte: end },
      endDate: { $gte: start }
    });

    if (conflict) {
      return res.status(409).json({ message: "Kechirasiz, tanlangan sanalarda dacha band" });
    }

    const booking = await Booking.create({
      dachaId,
      startDate: start,
      endDate: end,
      name,
      phone,
      totalPrice: 0,
      prepayment: 0,
      status: 'pending'
    });

    const message = `
🌟 <b>YANGI GUEST BUYURTMA (KUTILMOQDA)</b>

👤 Mijoz: ${name}
📞 Tel: ${phone}
🏠 Dacha: ${dacha.name}
📅 ${start.toLocaleDateString("ru-RU")} → ${end.toLocaleDateString("ru-RU")}

Iltimos, mijoz bilan bog'lanib rasmiylashtiring!
    `;

    try {
      await sendTelegramMessage(message);
    } catch (err) {
      console.error("TELEGRAM ERROR:", err.message);
    }

    return res.status(201).json({ 
      message: "Buyurtmangiz qabul qilindi, tez orada bog'lanamiz", 
      bookingId: booking._id 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server xatosi yuz berdi" });
  }
};
