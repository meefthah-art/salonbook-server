const jwt = require("jsonwebtoken");
const { getDB } = require("../db");

const cookieOptions = () => {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
};

const makeToken = (email) => jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });

async function verifyToken(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ message: "Please sign in to continue." });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }

  try {
    // role and blocked status always come from the database, not from the token
    const user = await getDB().collection("users").findOne({ email: decoded.email });
    if (!user) return res.status(401).json({ message: "Account not found." });
    if (user.isBlocked) return res.status(403).json({ message: "Your account has been blocked. Please contact the salon." });

    req.user = { id: String(user._id), email: user.email, name: user.name, role: user.role || "customer" };
    next();
  } catch (err) {
    next(err);
  }
}

function verifyAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Only admins can do this." });
  next();
}

function verifyCustomer(req, res, next) {
  if (req.user.role !== "customer") return res.status(403).json({ message: "Only customers can do this." });
  next();
}

module.exports = { verifyToken, verifyAdmin, verifyCustomer, makeToken, cookieOptions };
