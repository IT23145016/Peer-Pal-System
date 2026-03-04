const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Assignment = require("../models/Assignment");
const AssignmentProgress = require("../models/AssignmentProgress");
const Module = require("../models/Module");
const { isStrongPassword, isValidEmail } = require("../utils/validation");

const generateCandidateId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `USR-${ts}-${rand}`;
};

const generateUniqueUserId = async () => {
  let candidate = generateCandidateId();
  let exists = await User.exists({ id: candidate });

  while (exists) {
    candidate = generateCandidateId();
    exists = await User.exists({ id: candidate });
  }

  return candidate;
};

const signToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, academicYear, semester, batch } = req.body;
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      return res.status(400).json({ message: "name, email, password and confirmPassword are required" });
    }

    if (normalizedName.length < 2 || normalizedName.length > 60) {
      return res.status(400).json({ message: "Name must be between 2 and 60 characters" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!isStrongPassword(password)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 chars and include uppercase, lowercase, and a number" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const normalizedRole = "user";
    const parsedYear = Number(academicYear);
    const parsedSemester = Number(semester);
    const normalizedBatch = typeof batch === "string" ? batch.trim() : "";

    if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 6) {
      return res.status(400).json({ message: "academicYear must be between 1 and 6" });
    }
    if (!Number.isInteger(parsedSemester) || ![1, 2].includes(parsedSemester)) {
      return res.status(400).json({ message: "semester must be 1 or 2" });
    }

    const existingByEmail = await User.findOne({ email: normalizedEmail });
    if (existingByEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = await generateUniqueUserId();

    const user = await User.create({
      id,
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      academicYear: parsedYear,
      semester: parsedSemester,
      batch: normalizedBatch,
    });

    const token = signToken(user);

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        academicYear: user.academicYear,
        semester: user.semester,
        batch: user.batch,
        avatar: user.avatar,
        isBatchTop: user.isBatchTop,
        isTalented: user.isTalented,
        moduleSpecialization: user.moduleSpecialization,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is deactivated. Contact admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        academicYear: user.academicYear,
        semester: user.semester,
        batch: user.batch,
        avatar: user.avatar,
        isBatchTop: user.isBatchTop,
        isTalented: user.isTalented,
        moduleSpecialization: user.moduleSpecialization,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "name email role academicYear semester batch avatar isBatchTop isTalented moduleSpecialization createdAt"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch profile", error: error.message });
  }
};

const updateMe = async (req, res) => {
  try {
    const { name, email, avatar, academicYear, semester, batch } = req.body;
    const updates = {};

    if (typeof name === "string") {
      const normalizedName = name.trim();
      if (!normalizedName || normalizedName.length < 2 || normalizedName.length > 60) {
        return res.status(400).json({ message: "Name must be between 2 and 60 characters" });
      }
      updates.name = normalizedName;
    }

    if (typeof email === "string") {
      const normalizedEmail = email.trim().toLowerCase();
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const existingByEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: req.user.userId },
      });
      if (existingByEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }

      updates.email = normalizedEmail;
    }

    if (typeof avatar === "string") {
      if (avatar.length > 2_000_000) {
        return res.status(400).json({ message: "Profile image is too large" });
      }
      updates.avatar = avatar;
    }

    if (typeof batch === "string") {
      updates.batch = batch.trim();
    }

    if (typeof academicYear !== "undefined") {
      const parsedYear = Number(academicYear);
      if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 6) {
        return res.status(400).json({ message: "academicYear must be between 1 and 6" });
      }
      updates.academicYear = parsedYear;
    }

    if (typeof semester !== "undefined") {
      const parsedSemester = Number(semester);
      if (!Number.isInteger(parsedSemester) || ![1, 2].includes(parsedSemester)) {
        return res.status(400).json({ message: "semester must be 1 or 2" });
      }
      updates.semester = parsedSemester;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true,
      select: "name email role academicYear semester batch avatar isBatchTop isTalented moduleSpecialization createdAt",
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: "Could not update profile", error: error.message });
  }
};

const deleteMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const assignmentsByUser = await Assignment.find({ createdBy: req.user.userId }).select("_id");
    const assignmentIds = assignmentsByUser.map((item) => item._id);

    await Promise.all([
      Assignment.deleteMany({ createdBy: req.user.userId }),
      AssignmentProgress.deleteMany({
        $or: [{ userId: req.user.userId }, { assignmentId: { $in: assignmentIds } }],
      }),
      Module.deleteMany({ createdBy: req.user.userId }),
      User.findByIdAndDelete(req.user.userId),
    ]);

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete account", error: error.message });
  }
};

module.exports = { register, login, me, updateMe, deleteMe };
