const router = require("express").Router();
const { ObjectId } = require("mongodb");
const { getDB } = require("../../db");
const { tryCatch } = require("../../utils/helpers");
const { getUsersMap, getServicesMap } = require("../../utils/populate");

router.get("/stats", tryCatch(async (req, res) => {
  const db = getDB();
  const [totalCustomers, activeServices, totalAppointments, pendingAppointments, confirmedAppointments, successfulPayments] =
    await Promise.all([
      db.collection("users").countDocuments({ role: { $ne: "admin" } }),
      db.collection("services").countDocuments({ status: "active" }),
      db.collection("appointments").countDocuments({}),
      db.collection("appointments").countDocuments({ status: "pending" }),
      db.collection("appointments").countDocuments({ status: "confirmed" }),
      db.collection("transactions").countDocuments({ status: "paid" }),
    ]);
  res.json({ totalCustomers, activeServices, totalAppointments, pendingAppointments, confirmedAppointments, successfulPayments });
}));

// read only, there is no route that can change a transaction
router.get("/transactions", tryCatch(async (req, res) => {
  const db = getDB();
  const list = await db.collection("transactions").find({}).sort({ createdAt: -1 }).toArray();

  const ids = list.filter((t) => ObjectId.isValid(t.appointmentId)).map((t) => new ObjectId(t.appointmentId));
  const appointments = await db.collection("appointments").find({ _id: { $in: ids } }).toArray();
  const appointmentMap = {};
  appointments.forEach((a) => (appointmentMap[String(a._id)] = a));

  const usersMap = await getUsersMap(list.map((t) => t.customerId));
  const servicesMap = await getServicesMap(appointments.map((a) => a.serviceId));

  res.json(list.map((t) => {
    const appointment = appointmentMap[t.appointmentId];
    return {
      ...t,
      customer: usersMap[t.customerId] || null,
      appointmentDate: appointment ? appointment.appointmentDate : null,
      timeSlot: appointment ? appointment.timeSlot : null,
      serviceName: appointment && servicesMap[appointment.serviceId] ? servicesMap[appointment.serviceId].serviceName : "Deleted service",
    };
  }));
}));

module.exports = router;
