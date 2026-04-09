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
      adminId,
      images: req.body.images || [],
      video: req.body.video || "",
      features: req.body.features || [],
      location: req.body.location || ""
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
          images: 1,
          video: 1,
          location: 1,
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
    const mode = req.query.mode;

    if (!id || id.length !== 24) {
      return res.status(400).json({
        message: "Noto‘g‘ri Dacha ID"
      });
    }

    const dacha = await Dacha.findById(id);
    if (!dacha) {
      return res.status(404).json({
        message: "Dacha topilmadi"
      });
    }

    // Protect ownership
    if (dacha.adminId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Ruxsat yo'q"
      });
    }

    if (mode === "full") {
      await Booking.deleteMany({ dachaId: id });
    }

    await Dacha.findByIdAndDelete(id);

    return res.status(200).json({
      message: mode === "full" ? "Dacha va barcha bandliklar o'chirildi" : "Dacha o'chirildi, tarix saqlandi",
      deleted: true
    });

  } catch (error) {
    console.error("deleteDacha error:", error.message);
    return res.status(500).json({
      message: "Dachani o‘chirishda server xatosi"
    });
  }
};
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Fayl yuklanmadi" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({
      message: "Fayl yuklandi",
      url: fileUrl,
      type: req.file.mimetype.startsWith("video") ? "video" : "image"
    });
  } catch (error) {
    console.error("uploadFile error:", error);
    return res.status(500).json({ message: "Fayl yuklashda xatolik" });
  }
};
