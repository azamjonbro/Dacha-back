const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Token mavjud emas"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // token ichidan foydalanuvchini chiqarib qo‘yamiz
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token noto‘g‘ri yoki eskirgan"
    });
  }
};
