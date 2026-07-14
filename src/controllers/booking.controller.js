const Booking = require("../models/Booking.model");
const Dacha = require("../models/Dacha.model");
const {sendTelegramMessage} = require("../utils/telegram")
const normalizeDate = (date) => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  return new Date(Date.UTC(year, month, day));
};
const deactivateExpiredBookings = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await Booking.updateMany(
    {
      status: { $in: ['confirmed', 'band'] },
      endDate: { $lt: today }
    },
    {
      $set: { status: 'finished', isActive: false }
    }
  );
};

exports.createBooking = async (req, res) => {
  try {
    const {
      dachaId,
      startDate,
      endDate,
      totalPrice,
      prepayment,
      phone,
      name
    } = req.body;

    if (!dachaId || !startDate || !endDate || !name || !phone) {
      return res.status(400).json({
        message: "dachaId, startDate, endDate, name va phone majburiy"
      });
    }

    const dacha = await Dacha.findOne({
      _id: dachaId,
      adminId: req.user.id,
      isActive: true
    });

    if (!dacha) {
      return res.status(403).json({
        message: "Bu dacha sizga tegishli emas"
      });
    }

    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);

    if (start > end) {
      return res.status(400).json({
        message: "startDate endDate dan katta bo‘lishi mumkin emas"
      });
    }

    const conflict = await Booking.findOne({
      dachaId,
      status: { $in: ['confirmed', 'band'] },
      startDate: { $lte: end },
      endDate: { $gte: start }
    });

    if (conflict) {
      return res.status(409).json({
        message: "Bu sanalar oralig‘ida dacha band",
        conflictBookingId: conflict._id
      });
    }

    const booking = await Booking.create({
      dachaId,
      startDate: start,
      endDate: end,
      totalPrice: totalPrice || 0,
      prepayment: prepayment || 0,
      phone: phone || "",
      createdBy: req.user.id,
      status: 'confirmed',
      name: name || ""
    });

    const message = `
🏡 <b>Admin: Yangi booking qo'shildi</b>

👤 ${name || "Noma'lum"}
📅 ${start.toLocaleDateString()} → ${end.toLocaleDateString()}
💰 ${totalPrice}
💵 Avans: ${prepayment}
📞 ${phone || "-"}

🆔 <code>${booking._id}</code>
`;

    try {
      await sendTelegramMessage(message);
    } catch (err) {
      console.error("TELEGRAM ERROR:", err.message);
    }

    return res.status(201).json({
      message: "Booking muvaffaqiyatli yaratildi",
      data: booking
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Booking yaratishda server xatosi"
    });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking topilmadi" });
    }

    const dacha = await Dacha.findOne({
      _id: booking.dachaId,
      adminId: req.user.id
    });

    if (!dacha) {
      return res.status(403).json({ message: "Ruxsat yo‘q" });
    }

    const newStart = req.body.startDate
      ? normalizeDate(req.body.startDate)
      : booking.startDate;

    const newEnd = req.body.endDate
      ? normalizeDate(req.body.endDate)
      : booking.endDate;

    if (newStart > newEnd) {
      return res.status(400).json({
        message: "startDate endDate dan katta bo‘lishi mumkin emas"
      });
    }

    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      dachaId: booking.dachaId,
      status: { $in: ['confirmed', 'band'] },
      startDate: { $lte: newEnd },
      endDate: { $gte: newStart }
    });

    if (conflict) {
      return res.status(409).json({
        message: "Bu sanalar band"
      });
    }

    booking.startDate = newStart;
    booking.endDate = newEnd;

    if (req.body.totalPrice !== undefined) booking.totalPrice = req.body.totalPrice;
    if (req.body.prepayment !== undefined) booking.prepayment = req.body.prepayment;
    if (req.body.phone !== undefined) booking.phone = req.body.phone;
    if (req.body.name !== undefined) booking.name = req.body.name;
    if (req.body.status !== undefined) booking.status = req.body.status;

    await booking.save();

    return res.json({
      message: "Booking muvaffaqiyatli yangilandi",
      data: booking
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server xatosi"
    });
  }
};


exports.getBookings = async (req, res) => {
  try {
    await deactivateExpiredBookings();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dachas = await Dacha.find({ adminId: req.user.id }).select("_id");
    const dachaIds = dachas.map((d) => d._id);

    const bookings = await Booking.find({
      dachaId: { $in: dachaIds },
      status: { $in: ['confirmed', 'band'] },
      endDate: { $gte: today }
    })
      .populate("dachaId", "name")
      .sort({ startDate: 1 });

    return res.json({
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error("GET BOOKINGS ERROR:", error);
    return res.status(500).json({
      message: "Bookinglarni olishda server xatosi"
    });
  }
};

exports.getBookingHistory = async (req, res) => {
  try {
    await deactivateExpiredBookings();

    const dachas = await Dacha.find({ adminId: req.user.id }).select("_id");
    const dachaIds = dachas.map((d) => d._id);

    const bookings = await Booking.find({
      dachaId: { $in: dachaIds }
    })
      .populate("dachaId", "name")
      .sort({ endDate: -1 });

    return res.json({
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    return res.status(500).json({
      message: "Booking history olishda server xatosi"
    });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const mode = req.query.mode;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        message: "Band topilmadi"
      });
    }

    // Dacha egasi tekshiruvi
    const dacha = await Dacha.findOne({
      _id: booking.dachaId,
      adminId: req.user.id
    });

    if (!dacha) {
      return res.status(403).json({
        message: "Bu bandni o‘chirishga ruxsat yo‘q"
      });
    }

    if (mode === "full") {
      await Booking.findByIdAndDelete(id);
      return res.json({
        message: "Band to'liq o'chirib yuborildi va statistikadan tushib qoldirildi",
        data: { _id: booking._id, deletedCompletely: true }
      });
    } else {
      booking.isActive = false;
      await booking.save();
      return res.json({
        message: "Band muvaffaqiyatli bekor qilindi (Tarixda saqlandi)",
        data: { _id: booking._id, isActive: booking.isActive }
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Bandni o‘chirishda server xatosi"
    });
  }
};

exports.getPendingBookings = async (req, res) => {
  try {
    const dachas = await Dacha.find({ adminId: req.user.id }).select("_id name");
    const dachaIds = dachas.map((d) => d._id);

    const pendingBookings = await Booking.find({
      dachaId: { $in: dachaIds },
      status: 'pending'
    }).populate("dachaId", "name").sort({ createdAt: -1 });

    return res.json({
      count: pendingBookings.length,
      data: pendingBookings
    });
  } catch (error) {
    return res.status(500).json({ message: "Kutilayotgan bandlarni olishda xatolik" });
  }
};

exports.confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { totalPrice, prepayment, name, phone } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Topilmadi" });

    const dacha = await Dacha.findOne({ _id: booking.dachaId, adminId: req.user.id });
    if (!dacha) return res.status(403).json({ message: "Ruxsat yo'q" });

    // Double check overlap before confirmation
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      dachaId: booking.dachaId,
      status: { $in: ['confirmed', 'band'] },
      startDate: { $lte: booking.endDate },
      endDate: { $gte: booking.startDate }
    });

    if (conflict) {
      return res.status(409).json({ message: "Bu sanalarda allaqachon boshqa tasdiqlangan booking bor" });
    }

    booking.status = 'confirmed';
    if (totalPrice !== undefined) booking.totalPrice = totalPrice;
    if (prepayment !== undefined) booking.prepayment = prepayment;
    if (name !== undefined) booking.name = name;
    if (phone !== undefined) booking.phone = phone;

    await booking.save();
    return res.json({ message: "Tasdiqlandi", data: booking });
  } catch (error) {
    return res.status(500).json({ message: "Server xatosi" });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) return res.status(404).json({ message: "Topilmadi" });

    const dacha = await Dacha.findOne({ _id: booking.dachaId, adminId: req.user.id });
    if (!dacha) return res.status(403).json({ message: "Ruxsat yo'q" });

    booking.status = 'cancelled';
    booking.isActive = false;
    await booking.save();

    return res.json({ message: "Bekor qilindi" });
  } catch (error) {
    return res.status(500).json({ message: "Server xatosi" });
  }
};
