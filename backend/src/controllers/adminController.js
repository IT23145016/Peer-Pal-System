const User = require("../models/User");

const listUsers = async (req, res) => {
  try {
    const { year, semester, batch, role } = req.query;
    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (year !== undefined && year !== "") {
      const parsedYear = Number(year);
      if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 6) {
        return res.status(400).json({ message: "year must be between 1 and 6" });
      }
      filter.academicYear = parsedYear;
    }

    if (semester !== undefined && semester !== "") {
      const parsedSemester = Number(semester);
      if (!Number.isInteger(parsedSemester) || ![1, 2].includes(parsedSemester)) {
        return res.status(400).json({ message: "semester must be 1 or 2" });
      }
      filter.semester = parsedSemester;
    }

    if (typeof batch === "string" && batch.trim()) {
      filter.batch = batch.trim();
    }

    const users = await User.find(filter)
      .select("id name email role academicYear semester batch avatar isBatchTop isTalented moduleSpecialization isActive createdAt")
      .sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};

const setUserActiveStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be boolean" });
    }

    const targetUser = await User.findById(userId).select("role isActive");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (String(userId) === String(req.user.userId) && isActive === false) {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }

    if (targetUser.role === "admin" && isActive === false) {
      const activeAdminCount = await User.countDocuments({ role: "admin", isActive: true });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: "At least one active admin account is required" });
      }
    }

    targetUser.isActive = isActive;
    await targetUser.save();

    return res.status(200).json({ message: `User ${isActive ? "activated" : "deactivated"} successfully` });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update user status", error: error.message });
  }
};

const setUserBatchTopStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBatchTop, moduleSpecialization } = req.body;

    if (typeof isBatchTop !== "boolean") {
      return res.status(400).json({ message: "isBatchTop must be boolean" });
    }

    const targetUser = await User.findById(userId).select("role isBatchTop moduleSpecialization");
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser.role === "admin") {
      return res.status(400).json({ message: "Admin account cannot be set as batch top from this action" });
    }

    targetUser.isBatchTop = isBatchTop;
    if (typeof moduleSpecialization === "string") {
      targetUser.moduleSpecialization = moduleSpecialization.trim();
    }
    if (!isBatchTop) {
      targetUser.moduleSpecialization = "";
    }
    await targetUser.save();

    return res.status(200).json({
      message: isBatchTop ? "User marked as Batch Top" : "Batch Top role removed",
      user: {
        _id: targetUser._id,
        isBatchTop: targetUser.isBatchTop,
        moduleSpecialization: targetUser.moduleSpecialization,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update batch top status", error: error.message });
  }
};

const setUserTalentedStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isTalented } = req.body;
    if (typeof isTalented !== "boolean") {
      return res.status(400).json({ message: "isTalented must be boolean" });
    }

    const targetUser = await User.findById(userId).select("isTalented");
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    targetUser.isTalented = isTalented;
    await targetUser.save();

    return res.status(200).json({
      message: isTalented ? "User marked as Talented" : "Talented badge removed",
      user: { _id: targetUser._id, isTalented: targetUser.isTalented },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update talented status", error: error.message });
  }
};

module.exports = { listUsers, setUserActiveStatus, setUserBatchTopStatus, setUserTalentedStatus };
