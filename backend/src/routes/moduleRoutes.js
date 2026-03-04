const express = require("express");
const { createModule, deleteModule, listModules, updateModule } = require("../controllers/moduleController");
const { auth, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", auth, listModules);
router.post("/", auth, authorizeRole("admin"), createModule);
router.put("/:id", auth, authorizeRole("admin"), updateModule);
router.delete("/:id", auth, authorizeRole("admin"), deleteModule);

module.exports = router;
