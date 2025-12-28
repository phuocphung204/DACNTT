import Department from "../models/Department.js";

// System
export const getAllLabels = async (req, res) => {
  try {
    const departments = await Department.find({}, { labels: 1 });
    const allLabels = departments.flatMap(dept => dept.labels);
    res.status(200).json({ ec: 200, em: "Labels fetched successfully", dt: allLabels });
  } catch (error) {
    res.status(500).json({ ec: 500, em: error.message });
  }
};

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

// Officer only
export const createKnowledgeBase = async (req, res) => {
  try {
    const { department_id, label_id } = req.params;
    const { title, content } = req.body;
    const department = await Department.findById(department_id);
    if (!department) {
      return res.status(404).json({ ec: 404, me: "Department not found" });
    }
    const label = department.labels.find(l => l.label_id.toString() === label_id);
    if (!label) {
      return res.status(404).json({ ec: 404, me: "Label not found" });
    }
    const newKnowledgeBase = { title, content };
    label.knowledge_base.push(newKnowledgeBase);
    await department.save();
    res.status(201).json({ ec: 201, me: "Knowledge base created successfully", dt: newKnowledgeBase });
  } catch (error) {
    res.status(500).json({ ec: 500, me: error.message });
  }
};

export const updateKnowledgeBase = async (req, res) => {
  try {
    const { department_id, label_id, knowledge_base_id } = req.params;
    const { title, content } = req.body;
    const department = await Department.findById(department_id);
    if (!department) {
      return res.status(404).json({ ec: 404, me: "Department not found" });
    }
    const label = department.labels.find(l => l.label_id.toString() === label_id);
    if (!label) {
      return res.status(404).json({ ec: 404, me: "Label not found" });
    }
    const knowledgeBase = label.knowledge_base.id(knowledge_base_id);
    if (!knowledgeBase) {
      return res.status(404).json({ ec: 404, me: "Knowledge base not found" });
    }
    knowledgeBase.title = title;
    knowledgeBase.content = content;
    await department.save();
    res.status(200).json({ ec: 200, me: "Knowledge base updated successfully", dt: knowledgeBase });
  } catch (error) {
    res.status(500).json({ ec: 500, me: error.message });
  }
};

export const deleteKnowledgeBase = async (req, res) => {
  try {
    const { department_id, label_id, knowledge_base_id } = req.params;
    const department = await Department.findById(department_id);
    if (!department) {
      return res.status(404).json({ ec: 404, me: "Department not found" });
    }
    const label = department.labels.find(l => l.label_id.toString() === label_id);
    if (!label) {
      return res.status(404).json({ ec: 404, me: "Label not found" });
    }
    const knowledgeBase = label.knowledge_base.id(knowledge_base_id);
    if (!knowledgeBase) {
      return res.status(404).json({ ec: 404, me: "Knowledge base not found" });
    }
    label.knowledge_base.pull(knowledge_base_id);
    await department.save();
    res.status(200).json({ ec: 200, me: "Knowledge base deleted successfully", dt: knowledgeBase });
  } catch (error) {
    res.status(500).json({ ec: 500, me: error.message });
  }
};