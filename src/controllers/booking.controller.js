const Booking = require("../models/Booking.model");
const Dacha = require("../models/Dacha.model");

const normalizeDate = (date) => {
  const d = new Date(date + "T00:00:00");  // ✅ LOCAL sifatida parse qiladi
  d.setHours(0, 0, 0, 0);
  return d;
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

exports.deleteBookingDay = async (req, res) => {
  try {
    const { id } = req.params; 
    const { day } = req.body;   

    if (!day) {
      return res.status(400).json({ message: "day majburiy" });
    }

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

    const removeDay = normalizeDate(day);
    const start = normalizeDate(booking.startDate);
    const end = normalizeDate(booking.endDate);

    if (removeDay < start || removeDay > end) {
      return res.status(400).json({
        message: "Bu sana booking oralig‘ida emas"
      });
    }


    if (start.getTime() === end.getTime()) {
      await booking.deleteOne();
      return res.json({ message: "Booking o‘chirildi (1 kun edi)" });
    }

    // BOSHIDAN KESISH
    if (removeDay.getTime() === start.getTime()) {
      booking.startDate = new Date(start.setDate(start.getDate() + 1));
      await booking.save();
      return res.json({ message: "Boshlanishdan 1 kun olib tashlandi" });
    }

    // OXIRIDAN KESISH
    if (removeDay.getTime() === end.getTime()) {
      booking.endDate = new Date(end.setDate(end.getDate() - 1));
      await booking.save();
      return res.json({ message: "Oxiridan 1 kun olib tashlandi" });
    }

    // O‘RTADAN BO‘LISH
    const firstPartEnd = new Date(removeDay);
    firstPartEnd.setDate(firstPartEnd.getDate() - 1);

    const secondPartStart = new Date(removeDay);
    secondPartStart.setDate(secondPartStart.getDate() + 1);

    // eski bookingni update qilamiz
    booking.endDate = firstPartEnd;
    await booking.save();

    // yangi booking yaratamiz
    await Booking.create({
      dachaId: booking.dachaId,
      startDate: secondPartStart,
      endDate: end,
      OrderedUser: booking.OrderedUser,
      totalPrice: booking.totalPrice,
      avans: booking.avans,
      phone1: booking.phone1,
      phone2: booking.phone2,
      createdBy: booking.createdBy,
      isActive: true
    });

    return res.json({
      message: "Booking o‘rtadan ikkiga bo‘lindi va sana olib tashlandi"
    });

  } catch (error) {
    return res.status(500).json({
      message: "Bookingdan kun o‘chirishda server xatosi"
    });
  }
};

