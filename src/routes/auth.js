const router = require("express").Router();
const { makeToken, cookieOptions } = require("../middleware/auth");
const { tryCatch } = require("../utils/helpers");

// called by the Next.js server after Better Auth has checked the login
router.post("/token", tryCatch(async (req, res) => {
  if (req.headers["x-internal-secret"] !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  const token = makeToken(email);
  res.cookie("token", token, cookieOptions());
  res.json({ success: true, token });
}));

router.post("/logout", (req, res) => {
  res.clearCookie("token", { ...cookieOptions(), maxAge: undefined });
  res.json({ success: true });
});

module.exports = router;
