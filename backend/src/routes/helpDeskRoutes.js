const express = require("express");
const {
  approveHelpDocument,
  createHelpRequest,
  deleteHelpRequest,
  getLeaderboard,
  listHelpRequests,
  listMyHelpRequests,
  updateHelpRequest,
  uploadHelpDocument,
} = require("../controllers/helpDeskController");
const { auth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", auth, listHelpRequests);
router.get("/my", auth, listMyHelpRequests);
router.get("/leaderboard", auth, getLeaderboard);
router.post("/", auth, createHelpRequest);
router.put("/:id", auth, updateHelpRequest);
router.delete("/:id", auth, deleteHelpRequest);
router.post("/:id/documents", auth, uploadHelpDocument);
router.post("/:id/documents/:documentId/approve", auth, approveHelpDocument);

module.exports = router;
