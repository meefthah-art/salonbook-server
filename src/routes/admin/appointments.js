const router = require("express").Router();
const { ObjectId } = require("mongodb");
const { getDB } = require("../../db");
const { tryCatch, isValidId } = require("../../utils/helpers");
const { addServiceAndCustomer } = require("../../utils/populate");

const appointments = () => getDB().collection("appointments");

router.get("/", tryCatch(async (req, res) => {
  const filter = {};
  if (["pending", "confirmed", "cancelled"].includes(req.query.status)) filter.status = req.query.status;
  const list = await appointments().find(filter).sort({ createdAt: -1 }).toArray();
  res.json(await addServiceAndCustomer(list));
}));

router.patch("/:id/confirm", tryCatch(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid appointment." });
  const _id = new ObjectId(req.params.id);
  const appointment = await appointments().findOne({ _id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  if (appointment.status !== "pending") return res.status(400).json({ message: "Only pending appointments can be confirmed." });
  await appointments().updateOne({ _id }, { $set: { status: "confirmed" } });
  res.json({ success: true });
}));

router.patch("/:id/cancel", tryCatch(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid appointment." });
  const _id = new ObjectId(req.params.id);
  const appointment = await appointments().findOne({ _id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  if (appointment.status === "cancelled") return res.status(400).json({ message: "This appointment is already cancelled." });
  await appointments().updateOne({ _id }, { $set: { status: "cancelled" } });
  res.json({ success: true });
}));

module.exports = router;
