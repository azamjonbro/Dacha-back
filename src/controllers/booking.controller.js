const Booking = require("../models/Booking.model");
const Dacha = require("../models/Dacha.model");

const normalizeDate = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const deactivateExpiredBookings = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await Booking.updateMany(
    {
      isActive: true,
      endDate: { $lt: today }
    },
    {
      $set: { isActive: false }
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
      avans,
      phone1,
      phone2,
      OrderedUser
    } = req.body;

    if (!dachaId || !startDate || !endDate) {
      return res.status(400).json({
        message: "dachaId, startDate va endDate majburiy"
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
      avans: avans || 0,
      phone1: phone1 || "",
      phone2: phone2 || "",
      createdBy: req.user.id,
      isActive: true,
      OrderedUser: OrderedUser || ""
    });

    return res.status(201).json({
      message: "Booking muvaffaqiyatli yaratildi",
      data: booking
    });
  } catch (error) {
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
      return res.status(404).json({
        message: "Booking topilmadi"
      });
    }

    const dacha = await Dacha.findOne({
      _id: booking.dachaId,
      adminId: req.user.id
    });

    if (!dacha) {
      return res.status(403).json({
        message: "Bu bookingni o‘zgartirishga ruxsat yo‘q"
      });
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
      startDate: { $lte: newEnd },
      endDate: { $gte: newStart }
    });

    if (conflict) {
      return res.status(409).json({
        message: "Bu sanalar oralig‘ida dacha band",
        conflictBookingId: conflict._id
      });
    }

    booking.startDate = newStart;
    booking.endDate = newEnd;

    if (req.body.totalPrice !== undefined)
      booking.totalPrice = req.body.totalPrice;
    if (req.body.avans !== undefined)
      booking.avans = req.body.avans;
    if (req.body.phone1 !== undefined)
      booking.phone1 = req.body.phone1;
    if (req.body.phone2 !== undefined)
      booking.phone2 = req.body.phone2;

    await booking.save();

    return res.json({
      message: "Booking muvaffaqiyatli yangilandi",
      data: booking
    });
  } catch (error) {
    return res.status(500).json({
      message: "Booking yangilashda server xatosi"
    });
  }
};

exports.getBookings = async (req, res) => {
  try {
    await deactivateExpiredBookings();

    const dachas = await Dacha.find({ adminId: req.user.id }).select("_id");
    const dachaIds = dachas.map((d) => d._id);

    const bookings = await Booking.find({
      dachaId: { $in: dachaIds },
      isActive: true
    })
      .populate("dachaId", "name")
      .sort({ startDate: 1 });

    return res.json({
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
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


    booking.isActive = false;
    await booking.save();

    return res.json({
      message: "Band muvaffaqiyatli bekor qilindi",
      data: {
        _id: booking._id,
        isActive: booking.isActive
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Bandni o‘chirishda server xatosi"
    });
  }
};


