// controllers/dacha.controller.js
const Dacha = require("../models/Dacha.model");
const Booking = require("../models/Booking.model");

/**
 * CREATE DACHA
 * Superadmin yaratadi
 */
exports.createDacha = async (req, res) => {
  try {
    const { name, adminId } = req.body;

    // validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        message: "Dacha nomi majburiy va kamida 2 ta belgi bo‘lishi kerak"
      });
    }

    const dacha = await Dacha.create({
      name: name.trim(),
      adminId
    });

    return res.status(201).json({
      message: "Dacha muvaffaqiyatli yaratildi",
      data: dacha
    });
  } catch (error) {
    console.error("createDacha error:", error.message);
    return res.status(500).json({
      message: "Dacha yaratishda server xatosi"
    });
  }
};


/**
 * UPDATE DACHA
 * Superadmin -> admin biriktirishi yoki nomini o‘zgartirishi mumkin
 */
exports.updateDacha = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // agar name bo‘lsa, tekshiramiz
    if (updateData.name && updateData.name.trim().length < 2) {
      return res.status(400).json({
        message: "Dacha nomi kamida 2 ta belgi bo‘lishi kerak"
      });
    }

    const updated = await Dacha.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Dacha topilmadi"
      });
    }

    return res.json({
      message: "Dacha muvaffaqiyatli yangilandi",
      data: updated
    });
  } catch (error) {
    console.error("updateDacha error:", error.message);
    return res.status(500).json({
      message: "Dacha yangilashda server xatosi"
    });
  }
};

exports.getMyDachas = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        message: "Foydalanuvchi aniqlanmadi"
      });
    }

    const dachas = await Dacha.find({
      adminId: req.user.id,
      isActive: true
    }).sort({ createdAt: -1 });

    return res.json({
      count: dachas.length,
      data: dachas
    });
  } catch (error) {
    console.error("getMyDachas error:", error.message);
    return res.status(500).json({
      message: "Dachalarni olishda server xatosi"
    });
  }
};

/**
 * GET ALL DACHAS
 * Superadmin -> barcha dachalar
 */
exports.getAllDachas = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dachas = await Dacha.aggregate([
      {
        $lookup: {
          from: "bookings",
          let: { dachaId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$dachaId", "$$dachaId"] },
                    { $eq: ["$isActive", true] },
                    { $gte: ["$endDate", today] }
                  ]
                }
              }
            },
            {
              $sort: { startDate: 1 }
            }
          ],
          as: "booking"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "adminId",
          foreignField: "_id",
          as: "admin"
        }
      },
      {
        $unwind: {
          path: "$admin",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          name: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          booking: 1,
          admin: {
            _id: "$admin._id",
            username: "$admin.username",
            role: "$admin.role"
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    return res.json({
      count: dachas.length,
      data: dachas
    });
  } catch (error) {
    console.error("getAllDachas error:", error.message);
    return res.status(500).json({
      message: "Barcha dachalarni olishda server xatosi"
    });
  }
};



exports.deleteDacha = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.length !== 24) {
      return res.status(400).json({
        message: "Noto‘g‘ri Dacha ID"
      });
    }

    const deleted = await Dacha.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        message: "Dacha topilmadi"
      });
    }

    return res.status(200).json({
      message: "Dacha muvaffaqiyatli o‘chirildi",
      deleted
    });

  } catch (error) {
    console.error("deleteDacha error:", error.message);
    return res.status(500).json({
      message: "Dachani o‘chirishda server xatosi"
    });
  }
};
