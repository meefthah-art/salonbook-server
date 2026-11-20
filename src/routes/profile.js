const router = require("express").Router();
const { getDB } = require("../db");
const { verifyToken } = require("../middleware/auth");
const { tryCatch } = require("../utils/helpers");

router.put("/", verifyToken, tryCatch(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const image = String(req.body.image || "").trim();
  const phone = String(req.body.phone || "").trim();

  if (name.length < 2) return res.status(400).json({ message: "Please enter your full name." });
  if (phone && !/^[0-9+\-\s]{6,20}$/.test(phone)) return res.status(400).json({ message: "Please enter a valid phone number." });

  // only these three fields can be changed, never role or isBlocked
  await getDB().collection("users").updateOne(
    { email: req.user.email },
    { $set: { name, image, phone, updatedAt: new Date() } }
  );
  res.json({ success: true });
}));

module.exports = router;
