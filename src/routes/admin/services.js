const router = require("express").Router();
const { ObjectId } = require("mongodb");
const { getDB } = require("../../db");
const { tryCatch, isValidId, escapeRegex } = require("../../utils/helpers");

const services = () => getDB().collection("services");

function checkService(body) {
  const serviceName = String(body.serviceName || "").trim();
  const category = String(body.category || "").trim();
  const description = String(body.description || "").trim();
  const image = String(body.image || "").trim();
  const price = Number(body.price);
  const duration = Number(body.duration);
  const status = body.status === "inactive" ? "inactive" : "active";

  if (!serviceName || !category || !description) return { error: "Name, category and description are required." };
  if (!image) return { error: "Please upload a service image." };
  if (!(price > 0)) return { error: "Price must be a positive number." };
  if (!(duration > 0)) return { error: "Duration must be a positive number." };
  return { data: { serviceName, category, description, price, duration, image, status } };
}

router.get("/", tryCatch(async (req, res) => {
  const filter = {};
  const search = String(req.query.search || "").trim();
  if (search) filter.serviceName = { $regex: escapeRegex(search), $options: "i" };
  if (["active", "inactive"].includes(req.query.status)) filter.status = req.query.status;
  res.json(await services().find(filter).sort({ createdAt: -1 }).toArray());
}));

router.get("/:id", tryCatch(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid service." });
  const service = await services().findOne({ _id: new ObjectId(req.params.id) });
  if (!service) return res.status(404).json({ message: "Service not found." });
  res.json(service);
}));

router.post("/", tryCatch(async (req, res) => {
  const { data, error } = checkService(req.body);
  if (error) return res.status(400).json({ message: error });
  const result = await services().insertOne({ ...data, createdAt: new Date() });
  res.status(201).json({ insertedId: result.insertedId });
}));

router.put("/:id", tryCatch(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid service." });
  const { data, error } = checkService(req.body);
  if (error) return res.status(400).json({ message: error });
  const result = await services().updateOne({ _id: new ObjectId(req.params.id) }, { $set: { ...data, updatedAt: new Date() } });
  if (result.matchedCount === 0) return res.status(404).json({ message: "Service not found." });
  res.json({ success: true });
}));

router.patch("/:id/status", tryCatch(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid service." });
  const { status } = req.body;
  if (!["active", "inactive"].includes(status)) return res.status(400).json({ message: "Status must be active or inactive." });
  const result = await services().updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status } });
  if (result.matchedCount === 0) return res.status(404).json({ message: "Service not found." });
  res.json({ success: true });
}));

router.delete("/:id", tryCatch(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid service." });
  const busy = await getDB().collection("appointments").countDocuments({
    serviceId: req.params.id,
    status: { $in: ["pending", "confirmed"] },
  });
  if (busy > 0) {
    return res.status(400).json({ message: "This service has pending or confirmed appointments. Deactivate it instead of deleting." });
  }
  const result = await services().deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ message: "Service not found." });
  res.json({ success: true });
}));

module.exports = router;
