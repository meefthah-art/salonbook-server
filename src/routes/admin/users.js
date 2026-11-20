const router = require("express").Router();
const { ObjectId } = require("mongodb");
const { getDB } = require("../../db");
const { tryCatch, isValidId } = require("../../utils/helpers");

const users = () => getDB().collection("users");
const fields = { name: 1, email: 1, image: 1, phone: 1, role: 1, isBlocked: 1, createdAt: 1 };

router.get("/", tryCatch(async (req, res) => {
  const list = await users().find({ role: { $ne: "admin" } }, { projection: fields }).sort({ createdAt: -1 }).toArray();
  res.json(list.map((u) => ({ ...u, isBlocked: !!u.isBlocked })));
}));

router.get("/:id", tryCatch(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid user." });
  const user = await users().findOne({ _id: new ObjectId(req.params.id) }, { projection: fields });
  if (!user) return res.status(404).json({ message: "User not found." });

  const customerId = String(user._id);
  const totalAppointments = await getDB().collection("appointments").countDocuments({ customerId });
  const paidAppointments = await getDB().collection("appointments").countDocuments({ customerId, paymentStatus: "paid" });
  res.json({ ...user, isBlocked: !!user.isBlocked, totalAppointments, paidAppointments });
}));

async function setBlocked(req, res, blocked) {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid user." });
  const _id = new ObjectId(req.params.id);
  const user = await users().findOne({ _id });
  if (!user) return res.status(404).json({ message: "User not found." });
  if (user.role === "admin") return res.status(400).json({ message: "Admin accounts cannot be blocked." });
  await users().updateOne({ _id }, { $set: { isBlocked: blocked } });
  res.json({ success: true });
}

router.patch("/:id/block", tryCatch((req, res) => setBlocked(req, res, true)));
router.patch("/:id/unblock", tryCatch((req, res) => setBlocked(req, res, false)));

module.exports = router;
