const router = require("express").Router();
const { ObjectId } = require("mongodb");
const { getDB } = require("../db");
const { verifyToken } = require("../middleware/auth");
const { tryCatch, isValidId, escapeRegex } = require("../utils/helpers");

const services = () => getDB().collection("services");

router.get("/", tryCatch(async (req, res) => {
  const search = String(req.query.search || "").trim();
  const category = String(req.query.category || "");
  const sort = req.query.sort;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 9, 30);

  const filter = { status: "active" };
  if (search) filter.serviceName = { $regex: escapeRegex(search), $options: "i" };
  if (category && category !== "all") filter.category = category;

  let sortBy = { createdAt: -1 };
  if (sort === "price-asc") sortBy = { price: 1 };
  if (sort === "price-desc") sortBy = { price: -1 };

  const total = await services().countDocuments(filter);
  const items = await services().find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit).toArray();
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

router.get("/featured", tryCatch(async (req, res) => {
  const items = await services().find({ status: "active" }).sort({ createdAt: -1 }).limit(6).toArray();
  res.json(items);
}));

router.get("/categories", tryCatch(async (req, res) => {
  const rows = await services().aggregate([
    { $match: { status: "active" } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray();
  res.json(rows.map((r) => ({ category: r._id, count: r.count })));
}));

// details page is private
router.get("/:id", verifyToken, tryCatch(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "This service link is not valid." });

  const service = await services().findOne({ _id: new ObjectId(req.params.id) });
  if (!service) return res.status(404).json({ message: "We could not find this service." });
  if (service.status !== "active" && req.user.role !== "admin") {
    return res.status(404).json({ message: "This service is not available right now." });
  }
  res.json(service);
}));

module.exports = router;
