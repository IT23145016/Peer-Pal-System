const express = require("express");
const { createCalendarEvent, listCalendarEvents } = require("../controllers/calendarEventController");
const { auth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", auth, listCalendarEvents);
router.post("/", auth, createCalendarEvent);

module.exports = router;
