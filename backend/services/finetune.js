import { pipeline } from '@xenova/transformers';
import dotenv from 'dotenv';

dotenv.config();

// Load model pipeline từ Hugging Face Hub
let nlp = null;

export const initModel = async () => {
    if (!nlp) {
        nlp = await pipeline('text-classification', 'PhuocPhung/mbert_finetuned', {
            auth: process.env.HUGGINGFACEHUB_API_TOKEN
        });
        console.log('Model AI loaded');
    }
    return nlp;
};

const id2label = {
  0: "Chính sách - Học bổng",
  1: "Chương trình thạc sĩ",
  2: "Chương trình đào tạo",
  3: "Giấy tờ - Xác nhận",
  4: "Hành chính - Bảo hiểm",
  5: "Học phí - Kế toán",
  6: "Hỗ trợ hệ thống - CNTT",
  7: "Hỗ trợ khó khăn cá nhân",
  8: "Khen thưởng - Kỷ luật",
  9: "Ký túc xá",
  10: "Phúc khảo - Khảo thí",
  11: "Thư viện - Học liệu",
  12: "Tư vấn hướng nghiệp",
  13: "Tư vấn học tập",
  14: "Tư vấn tâm lý",
  15: "Yêu cầu học vụ",
  16: "Điểm rèn luyện"
};

export const predict_label = async (req, res) => {
    try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ ec: 400, em: "Invalid input text" });
    }
    // Dự đoán
    const result = await nlp(text); // luôn trả về mảng 1 phần tử
    const id = parseInt(result[0].label.replace("LABEL_", ""));
    const mapped =  {
          id,
          label: id2label[id],
          score: result[0].score
        };
    res.status(200).json({ ec: 200, em: "Prediction successful", dt: mapped });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};