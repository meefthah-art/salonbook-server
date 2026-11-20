require("dotenv").config();
const { connectDB } = require("./db");

const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=80`;

const services = [
  { serviceName: "Classic Haircut", category: "Haircut & Styling", price: 18, duration: 40, image: photo("photo-1522337360788-8b13dee7a37e"), description: "A clean cut with a wash and a quick blow dry. Our stylist will shape it to suit your face and hair type." },
  { serviceName: "Blow Dry & Styling", category: "Haircut & Styling", price: 22, duration: 45, image: photo("photo-1560066984-138dadb4c035"), description: "Smooth, voluminous styling for parties, weddings or just a good hair day." },
  { serviceName: "Full Hair Coloring", category: "Hair Coloring", price: 65, duration: 120, image: photo("photo-1521590832167-7bcbfaa6381f"), description: "Single-colour hair coloring with a gentle, ammonia-free colour and a finishing treatment." },
  { serviceName: "Keratin Smoothing Treatment", category: "Hair Treatment", price: 90, duration: 150, image: photo("photo-1562322140-8baeececf3df"), description: "Reduces frizz and leaves hair smooth and shiny for up to three months." },
  { serviceName: "Deep Hydration Facial", category: "Facial & Skincare", price: 40, duration: 60, image: photo("photo-1570172619644-dfd03ed5d881"), description: "Deep cleansing, gentle exfoliation and a hydrating mask for tired, dry skin." },
  { serviceName: "Bridal Makeup", category: "Makeup", price: 120, duration: 120, image: photo("photo-1487412947147-5cebf100ffc2"), description: "Long-lasting bridal makeup with a trial look discussion before the big day." },
  { serviceName: "Gel Manicure", category: "Manicure & Pedicure", price: 25, duration: 50, image: photo("photo-1604654894610-df63bc536371"), description: "Nail shaping, cuticle care and a chip-free gel polish in the colour you like." },
  { serviceName: "Relaxing Spa Pedicure", category: "Manicure & Pedicure", price: 30, duration: 60, image: photo("photo-1519014816548-bf5fe059798b"), description: "Warm foot soak, scrub, massage and polish to leave your feet soft and fresh." },
  { serviceName: "Full Body Massage", category: "Spa & Massage", price: 55, duration: 60, image: photo("photo-1544161515-4ab6ce6db874"), description: "A calming full body massage with warm oil to relieve stress and sore muscles." },
];

async function run() {
  const db = await connectDB();
  const count = await db.collection("services").countDocuments({});
  if (count > 0) {
    console.log("Services already exist, nothing was added.");
    process.exit(0);
  }
  const now = new Date();
  await db.collection("services").insertMany(services.map((s, i) => ({ ...s, status: "active", createdAt: new Date(now.getTime() - i * 1000) })));
  console.log(`Added ${services.length} services.`);
  process.exit(0);
}

run();
