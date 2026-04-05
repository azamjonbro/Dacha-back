const Booking = require('../models/Booking.model');
const Dacha = require('../models/Dacha.model');

const getDateBounds = (queryMonth) => {
  if (queryMonth) {
    const [year, month] = queryMonth.split('-');
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0, 23, 59, 59);
    return { firstDay, lastDay };
  } else {
    // Default to last 30 days if no explicit month provided
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return { firstDay: thirtyDaysAgo, lastDay: now };
  }
};

// 1. Overview API
exports.getOverview = async (req, res) => {
  try {
    const { firstDay, lastDay } = getDateBounds(req.query.month);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalBookings, totalDachas] = await Promise.all([
      Booking.countDocuments({ 
        startDate: { $lte: lastDay },
        endDate: { $gte: firstDay }
      }),
      Dacha.countDocuments()
    ]);

    // Active bookings (currently ongoing today)
    const activeBookings = await Booking.countDocuments({
      isActive: true,
      startDate: { $lte: today },
      endDate: { $gte: today }
    });

    // Revenue Calculation
    const revenueStats = await Booking.aggregate([
      { 
        $match: { 
          startDate: { $lte: lastDay },
          endDate: { $gte: firstDay }
        } 
      },
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
    ]);
    const totalRevenue = revenueStats[0]?.totalRevenue || 0;

    res.status(200).json({
      totalBookings,
      totalRevenue,
      totalDachas,
      activeBookings,
      availableDachas: totalDachas - activeBookings
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 2. Revenue chart data
exports.getRevenue = async (req, res) => {
  try {
    const { firstDay, lastDay } = getDateBounds(req.query.month);

    const dailyRevenue = await Booking.aggregate([
      { 
        $match: { 
          startDate: { $gte: firstDay, $lte: lastDay } 
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$startDate" }
          },
          total: { $sum: "$totalPrice" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthlyRevenue = await Booking.aggregate([
      { $match: {} },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$startDate" }
          },
          total: { $sum: "$totalPrice" }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({ dailyRevenue, monthlyRevenue });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 3. Dacha Usage statistics
exports.getDachaUsage = async (req, res) => {
  try {
    const { firstDay, lastDay } = getDateBounds(req.query.month);

    const usage = await Booking.aggregate([
      { 
        $match: { 
          startDate: { $lte: lastDay },
          endDate: { $gte: firstDay }
        } 
      },
      {
        $group: {
          _id: "$dachaId",
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "dachas",
          localField: "_id",
          foreignField: "_id",
          as: "dacha"
        }
      },
      { 
        $unwind: { 
          path: "$dacha",
          preserveNullAndEmptyArrays: true
        } 
      },
      {
        $project: {
          dachaName: { $ifNull: ["$dacha.name", "O'chirilgan Dacha (Tarix)"] },
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json(usage);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 4. Occupancy 
exports.getOccupancy = async (req, res) => {
  try {
    const { firstDay, lastDay } = getDateBounds(req.query.month);
    const label = req.query.month ? req.query.month + ' oyi' : "So'nggi 30 kun";

    const matchBookings = await Booking.find({
      startDate: { $lte: lastDay },
      endDate: { $gte: firstDay }
    });

    res.status(200).json({
      activeBookingsThisMonth: matchBookings.length,
      timeframe: label
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
