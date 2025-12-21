import Department from "../models/Department.js";

// Admin and Staff only

export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find({});
    res.status(200).json({ ec: 200, em: "Departments fetched successfully", dt: departments });
  } catch (error) {
    res.status(500).json({ ec: 500, em: error.message });
  }
};

export const getDepartmentById = async (req, res) => {
  try {
    const { department_id } = req.params;
    const department = await Department.findById(department_id);
    if (!department) {
      return res.status(404).json({ ec: 404, em: "Department not found" });
    }
    res.status(200).json({ ec: 200, em: "Department fetched successfully", dt: department });
  }
  catch (error) {
    res.status(500).json({ ec: 500, em: error.message });
  }
};

// Admin only

export const createDepartment = async (req, res) => {
  try {
    const { name, description, labels } = req.body;
    const newDepartment = await Department.create({
      name,
      description,
      labels: labels || [],
    });
    res.status(201).json({ ec: 201, em: "Department created successfully", dt: newDepartment });
  } catch (error) {
    res.status(500).json({ ec: 500, em: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;
    const { name, description, labels } = req.body;
    const department = await Department.findByIdAndUpdate(department_id, { name, description, labels }, { new: true });
    if (!department) {
      return res.status(404).json({ ec: 404, em: "Department not found" });
    }
    res.status(200).json({ ec: 200, em: "Department updated successfully", dt: department });
  } catch (error) {
    res.status(500).json({ ec: 500, em: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;
    const department = await Department.findByIdAndDelete(department_id);
    if (!department) {
      return res.status(404).json({ ec: 404, em: "Department not found" });
    }
    res.status(200).json({ ec: 200, em: "Department deleted successfully", dt: department });
  } catch (error) {
    res.status(500).json({ ec: 500, em: error.message });
  }
};