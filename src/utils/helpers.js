const { ObjectId } = require("mongodb");

const TIME_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
];

const isValidId = (id) => typeof id === "string" && ObjectId.isValid(id) && String(new ObjectId(id)) === id;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// lets us skip try/catch in every route, errors go to the error handler in index.js
const tryCatch = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { TIME_SLOTS, isValidId, escapeRegex, tryCatch };
