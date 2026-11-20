require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./db");
const { stripeWebhook } = require("./routes/payments");

const app = express();

app.set("trust proxy", 1);
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(cookieParser());

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.log("database error:", err.message);
    res.status(500).json({ message: "Could not connect to the database." });
  }
});

// stripe needs the raw body to check the signature, so this goes before express.json()
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json());

app.get("/", (req, res) => res.json({ name: "SalonBook API", status: "running" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/services", require("./routes/services"));
app.use("/api/appointments", require("./routes/appointments"));
app.use("/api/payments", require("./routes/payments").router);
app.use("/api/profile", require("./routes/profile"));
app.use("/api/admin", require("./routes/admin"));

app.use((req, res) => res.status(404).json({ message: "Route not found." }));

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

const port = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(port, () => console.log(`SalonBook API running on port ${port}`));
}

module.exports = app;
