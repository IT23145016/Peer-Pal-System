const Module = require("../models/Module");
const User = require("../models/User");

const generateCandidateModuleId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MOD-${ts}-${rand}`;
};

const generateUniqueModuleId = async () => {
  let candidate = generateCandidateModuleId();
  let exists = await Module.exists({ moduleId: candidate });
  while (exists) {
    candidate = generateCandidateModuleId();
    exists = await Module.exists({ moduleId: candidate });
  }
  return candidate;
};

const normalizeModulePayload = (body = {}) => {
  const moduleCode = typeof body.moduleCode === "string" ? body.moduleCode.trim().toUpperCase() : "";
  const moduleName = typeof body.moduleName === "string" ? body.moduleName.trim() : "";
  const academicYear = Number(body.academicYear);
  const semester = Number(body.semester);
  return { moduleCode, moduleName, academicYear, semester };
};

const validateModulePayload = ({ moduleCode, moduleName, academicYear, semester }) => {
  if (!moduleCode || !moduleName) {
    return "moduleCode and moduleName are required";
  }
  if (!/^[A-Z]{2,5}\d{3,4}$/.test(moduleCode)) {
    return "moduleCode format is invalid (e.g. IT2030)";
  }
  if (!Number.isInteger(academicYear) || academicYear < 1 || academicYear > 6) {
    return "academicYear must be between 1 and 6";
  }
  if (!Number.isInteger(semester) || ![1, 2].includes(semester)) {
    return "semester must be 1 or 2";
  }
  return null;
};

const createModule = async (req, res) => {
  try {
    const payload = normalizeModulePayload(req.body);
    const validationError = validateModulePayload(payload);
    if (validationError) return res.status(400).json({ message: validationError });

    const existingByCode = await Module.findOne({ moduleCode: payload.moduleCode });
    if (existingByCode) {
      return res.status(409).json({ message: "moduleCode already exists" });
    }

    const moduleId = await generateUniqueModuleId();
    const moduleItem = await Module.create({
      moduleId,
      moduleCode: payload.moduleCode,
      moduleName: payload.moduleName,
      academicYear: payload.academicYear,
      semester: payload.semester,
      createdBy: req.user.userId,
    });

    return res.status(201).json({ message: "Module added", module: moduleItem });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add module", error: error.message });
  }
};

const listModules = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "user") {
      const user = await User.findById(req.user.userId).select("academicYear semester");
      if (!user || !user.academicYear || !user.semester) {
        return res.status(200).json([]);
      }
      query.academicYear = user.academicYear;
      query.semester = user.semester;
    } else {
      const year = req.query.year ? Number(req.query.year) : null;
      const semester = req.query.semester ? Number(req.query.semester) : null;
      if (Number.isInteger(year)) query.academicYear = year;
      if (Number.isInteger(semester)) query.semester = semester;
    }

    const modules = await Module.find(query).sort({ academicYear: 1, semester: 1, moduleCode: 1 });

    return res.status(200).json(modules);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch modules", error: error.message });
  }
};

const updateModule = async (req, res) => {
  try {
    const payload = normalizeModulePayload(req.body);
    const validationError = validateModulePayload(payload);
    if (validationError) return res.status(400).json({ message: validationError });

    const duplicateCode = await Module.findOne({
      moduleCode: payload.moduleCode,
      _id: { $ne: req.params.id },
    });
    if (duplicateCode) {
      return res.status(409).json({ message: "moduleCode already exists" });
    }

    const updated = await Module.findByIdAndUpdate(
      req.params.id,
      {
        moduleCode: payload.moduleCode,
        moduleName: payload.moduleName,
        academicYear: payload.academicYear,
        semester: payload.semester,
      },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Module not found" });
    return res.status(200).json({ message: "Module updated", module: updated });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update module", error: error.message });
  }
};

const deleteModule = async (req, res) => {
  try {
    const deleted = await Module.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Module not found" });
    return res.status(200).json({ message: "Module deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete module", error: error.message });
  }
};

module.exports = { createModule, listModules, updateModule, deleteModule };
