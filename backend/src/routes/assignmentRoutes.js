const express = require("express");
const { createAssignment, listAssignments, updateAssignmentProgress } = require("../controllers/assignmentController");
const { auth, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", auth, listAssignments);
router.post("/", auth, authorizeRole("admin"), createAssignment);
router.patch("/:id/progress", auth, updateAssignmentProgress);

module.exports = router;
