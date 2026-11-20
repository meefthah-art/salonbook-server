const router = require("express").Router();
const { verifyToken, verifyAdmin } = require("../../middleware/auth");

// every admin route goes through the token check and the admin check
router.use(verifyToken, verifyAdmin);

router.use("/services", require("./services"));
router.use("/appointments", require("./appointments"));
router.use("/users", require("./users"));
router.use("/", require("./overview"));

module.exports = router;
