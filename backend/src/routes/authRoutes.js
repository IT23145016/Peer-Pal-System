const express = require("express");
const { deleteMe, login, me, register, updateMe } = require("../controllers/authController");
const { auth, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, me);
router.put("/me", auth, updateMe);
router.delete("/me", auth, deleteMe);

router.get("/admin/dashboard", auth, authorizeRole("admin"), (req, res) => {
  res.status(200).json({
    message: "Admin dashboard access granted",
    role: req.user.role,
    name: req.user.name,
  });
});

router.get("/user/dashboard", auth, authorizeRole("user"), (req, res) => {
  res.status(200).json({
    message: "User dashboard access granted",
    role: req.user.role,
    name: req.user.name,
  });
});

module.exports = router;
