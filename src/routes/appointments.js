const router = require("express").Router();
const { ObjectId } = require("mongodb");
const { getDB } = require("../db");
const { verifyToken, verifyCustomer } = require("../middleware/auth");
const { tryCatch, isValidId, TIME_SLOTS } = require("../utils/helpers");
const { addServiceAndCustomer } = require("../utils/populate");

const appointments = () => getDB().collection("appointments");

router.use(verifyToken, verifyCustomer);

router.post("/", tryCatch(async (req, res) => {
  const { serviceId, appointmentDate, timeSlot } = req.body;
  const message = String(req.body.message || "").trim().slice(0, 300);

  if (!isValidId(serviceId)) return res.status(400).json({ message: "Invalid service." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate || "") || isNaN(new Date(appointmentDate))) {
    return res.status(400).json({ message: "Please choose a valid date." });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (appointmentDate < today) return res.status(400).json({ message: "Please choose today or a future date." });
  if (!TIME_SLOTS.includes(timeSlot)) return res.status(400).json({ message: "Please choose a time slot." });

  const service = await getDB().collection("services").findOne({ _id: new ObjectId(serviceId) });
  if (!service) return res.status(404).json({ message: "This service no longer exists." });
  if (service.status !== "active") return res.status(400).json({ message: "This service is not available for booking." });

  const clash = await appointments().findOne({
    appointmentDate,
    timeSlot,
    status: { $ne: "cancelled" },
    $or: [{ serviceId }, { customerId: req.user.id }],
  });
  if (clash) {
    const text = clash.customerId === req.user.id
      ? "You already have an appointment at this date and time."
      : "This time slot is already booked for this service. Please pick another slot.";
    return res.status(409).json({ message: text });
  }

  const result = await appointments().insertOne({
    serviceId,
    customerId: req.user.id,
    appointmentDate,
    timeSlot,
    message,
    servicePrice: service.price,
    paymentStatus: "unpaid",
    status: "pending",
    createdAt: new Date(),
  });
  res.status(201).json({ insertedId: result.insertedId });
}));

router.get("/my", tryCatch(async (req, res) => {
  const filter = { customerId: req.user.id };
  if (["pending", "confirmed", "cancelled"].includes(req.query.status)) filter.status = req.query.status;
  const list = await appointments().find(filter).sort({ createdAt: -1 }).toArray();
  res.json(await addServiceAndCustomer(list, false));
}));

router.get("/my/stats", tryCatch(async (req, res) => {
  const rows = await appointments().aggregate([
    { $match: { customerId: req.user.id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]).toArray();
  const stats = { total: 0, pending: 0, confirmed: 0, cancelled: 0 };
  rows.forEach((r) => {
    stats[r._id] = r.count;
    stats.total += r.count;
  });
  res.json(stats);
}));

router.get("/:id", tryCatch(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid appointment." });
  const appointment = await appointments().findOne({ _id: new ObjectId(req.params.id) });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  if (appointment.customerId !== req.user.id) return res.status(403).json({ message: "This is not your appointment." });
  const [full] = await addServiceAndCustomer([appointment], false);
  res.json(full);
}));

router.patch("/:id/cancel", tryCatch(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid appointment." });
  const _id = new ObjectId(req.params.id);
  const appointment = await appointments().findOne({ _id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  if (appointment.customerId !== req.user.id) return res.status(403).json({ message: "This is not your appointment." });
  if (appointment.status !== "pending") {
    return res.status(400).json({ message: "Only pending appointment requests can be cancelled." });
  }
  await appointments().updateOne({ _id }, { $set: { status: "cancelled" } });
  res.json({ success: true });
}));

module.exports = router;
