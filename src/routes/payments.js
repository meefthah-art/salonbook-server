const router = require("express").Router();
const Stripe = require("stripe");
const { ObjectId } = require("mongodb");
const { getDB } = require("../db");
const { verifyToken, verifyCustomer } = require("../middleware/auth");
const { tryCatch, isValidId } = require("../utils/helpers");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_missing");
const appointments = () => getDB().collection("appointments");
const transactions = () => getDB().collection("transactions");

router.post("/checkout", verifyToken, verifyCustomer, tryCatch(async (req, res) => {
  const { appointmentId } = req.body;
  if (!isValidId(appointmentId)) return res.status(400).json({ message: "Invalid appointment." });

  const appointment = await appointments().findOne({ _id: new ObjectId(appointmentId) });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  if (appointment.customerId !== req.user.id) return res.status(403).json({ message: "This is not your appointment." });
  if (appointment.status !== "confirmed") {
    return res.status(400).json({ message: "You can only pay for a confirmed appointment." });
  }
  if (appointment.paymentStatus === "paid") return res.status(400).json({ message: "This appointment is already paid." });

  const service = await getDB().collection("services").findOne({ _id: new ObjectId(appointment.serviceId) });
  if (!service) return res.status(404).json({ message: "The service for this appointment was not found." });

  const metadata = { appointmentId: String(appointment._id), customerId: appointment.customerId };
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: req.user.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(appointment.servicePrice * 100),
        product_data: {
          name: service.serviceName,
          description: `${appointment.appointmentDate} at ${appointment.timeSlot}`,
        },
      },
    }],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
  });

  res.json({ url: session.url });
}));

// the success page only reads this, the webhook is what really marks the payment as paid
router.get("/status", verifyToken, verifyCustomer, tryCatch(async (req, res) => {
  const sessionId = String(req.query.session_id || "");
  const transaction = await transactions().findOne({ stripeSessionId: sessionId, customerId: req.user.id });
  if (!transaction) return res.json({ status: "processing" });
  res.json({ status: transaction.status, amount: transaction.amount, currency: transaction.currency });
}));

async function savePaidPayment(session) {
  const { appointmentId } = session.metadata || {};
  if (!isValidId(appointmentId)) return;

  const appointment = await appointments().findOne({ _id: new ObjectId(appointmentId) });
  if (!appointment) return;
  if (session.amount_total !== Math.round(appointment.servicePrice * 100)) {
    console.log("payment amount does not match the appointment price", session.id);
    return;
  }

  await transactions().updateOne(
    { stripeSessionId: session.id },
    {
      $set: { status: "paid" },
      $setOnInsert: {
        appointmentId,
        customerId: appointment.customerId,
        amount: session.amount_total / 100,
        currency: session.currency,
        stripeSessionId: session.id,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
  await appointments().updateOne({ _id: appointment._id }, { $set: { paymentStatus: "paid" } });
}

async function saveFailedPayment(session) {
  const { appointmentId } = session.metadata || {};
  if (!isValidId(appointmentId)) return;
  const appointment = await appointments().findOne({ _id: new ObjectId(appointmentId) });
  if (!appointment) return;

  await transactions().updateOne(
    { stripeSessionId: session.id },
    {
      $setOnInsert: {
        appointmentId,
        customerId: appointment.customerId,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency,
        stripeSessionId: session.id,
        status: "failed",
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

// this route gets the raw body, see index.js
async function stripeWebhook(req, res) {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log("webhook signature failed:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  try {
    const object = event.data.object;
    if (event.type === "checkout.session.completed" && object.payment_status === "paid") await savePaidPayment(object);
    if (event.type === "checkout.session.async_payment_succeeded") await savePaidPayment(object);
    if (event.type === "checkout.session.async_payment_failed") await saveFailedPayment(object);
    res.json({ received: true });
  } catch (err) {
    console.log("webhook handling failed:", err.message);
    res.status(500).send("Webhook handler failed");
  }
}

module.exports = { router, stripeWebhook };
