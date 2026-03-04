const express = require("express");
const {
  listUsers,
  setUserActiveStatus,
  setUserBatchTopStatus,
  setUserTalentedStatus,
} = require("../controllers/adminController");
const { auth, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/users", auth, authorizeRole("admin"), listUsers);
router.patch("/users/:userId/status", auth, authorizeRole("admin"), setUserActiveStatus);
router.patch("/users/:userId/batch-top", auth, authorizeRole("admin"), setUserBatchTopStatus);
router.patch("/users/:userId/talented", auth, authorizeRole("admin"), setUserTalentedStatus);

module.exports = router;
