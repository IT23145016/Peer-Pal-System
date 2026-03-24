const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const assignmentRoutes = require("./src/routes/assignmentRoutes");
const helpDeskRoutes = require("./src/routes/helpDeskRoutes");
const moduleRoutes = require("./src/routes/moduleRoutes");
const studySupportRoutes = require("./src/routes/studySupportRoutes");
const calendarEventRoutes = require("./src/routes/calendarEventRoutes");

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true, limit: "4mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/", (req, res) => {
  res.json({ message: "Support System backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/helpdesk", helpDeskRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/study-support", studySupportRoutes);
app.use("/api/calendar-events", calendarEventRoutes);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Uploaded image is too large. Please use a smaller photo." });
  }

  return res.status(500).json({ message: "Unexpected server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
