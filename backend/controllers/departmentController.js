import Department from "../models/Department.js";

export const createDepartment = async (req, res) => {
  try {
    const { name, description, labels } = req.body;
    const newDepartment = await Department.create({
      name,
      description,
      labels: labels || [],
    });
    res.status(201).json({ ec: 201, me: "Department created successfully", dt: newDepartment });
  } catch (error) {
    res.status(500).json({ ec: 500, me: error.message });
  }
};

export const getDepartmentByLabel = async (req, res) => {
    try {
        const label = req.body.label;
        const department = await Department.findOne({ labels: label });
        res.json({ ec: 200, me: "Departments retrieved successfully", dt: department });
    } catch (error) {
        res.status(500).json({ ec: 500, me: error.message });
    }
};