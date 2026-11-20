const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const { MongoClient } = require("mongodb");

let db = null;

async function connectDB() {
  if (db) return db;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.DB_NAME || "salonbook");

  await db.collection("appointments").createIndex({ serviceId: 1, appointmentDate: 1, timeSlot: 1 });
  await db.collection("appointments").createIndex({ customerId: 1 });
  await db.collection("transactions").createIndex({ stripeSessionId: 1 }, { unique: true });
  return db;
}

function getDB() {
  if (!db) throw new Error("Database is not connected");
  return db;
}

module.exports = { connectDB, getDB };
