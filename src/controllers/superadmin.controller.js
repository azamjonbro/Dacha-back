const bcrypt = require("bcrypt");
const User = require("../models/User.model");
const Dacha = require("../models/Dacha.model");

/**
 * Superadmin -> Admin yaratadi
 */
exports.createAdmin = async (req, res) => {
  const { username, password } = req.body;

  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ message: "Username band" });

  const hash = await bcrypt.hash(password, 10);

  const admin = await User.create({
    username,
    password: hash,
    role: "admin"
  });

  res.status(201).json({
    id: admin._id,
    username: admin.username,
    role: admin.role
  });
};

/**
 * Superadmin -> Dacha yaratadi (va admin biriktirishi ham mumkin)
 */
exports.createDacha = async (req, res) => {
  const { name, adminId } = req.body;

  const dacha = await Dacha.create({
    name,
    adminId: adminId || null
  });

  res.status(201).json(dacha);
};
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.json({
      count: admins.length,
      data: admins
    });
  } catch (error) {
    console.error("getAllAdmins error:", error.message);
    return res.status(500).json({
      message: "Adminlarni olishda server xatosi"
    });
  }
};


/**
 * Superadmin -> Dacha update (adminId ni o‘zgartiradi)
 */
exports.updateDacha = async (req, res) => {
  const updated = await Dacha.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: "Dacha topilmadi" });
  res.json(updated);
};

/**
 * Superadmin -> dacha list
 */
exports.getAllDachas = async (req, res) => {
  const list = await Dacha.find().populate("adminId", "username role");
  res.json(list);
};
