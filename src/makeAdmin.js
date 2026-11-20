require("dotenv").config();
const { connectDB } = require("./db");

// usage: npm run make-admin -- someone@example.com
// the person must have signed up on the website first
async function run() {
  const email = process.argv[2];
  if (!email) {
    console.log("Please give an email. Example: npm run make-admin -- admin@example.com");
    process.exit(1);
  }
  const db = await connectDB();
  const result = await db.collection("users").updateOne({ email: email.toLowerCase() }, { $set: { role: "admin" } });
  if (result.matchedCount === 0) {
    console.log("No user found with that email. Sign up on the website first.");
    process.exit(1);
  }
  console.log(`${email} is now an admin.`);
  process.exit(0);
}

run();
