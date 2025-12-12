import { pipeline, env } from '@xenova/transformers';

// Đặt cấu hình môi trường để chỉ sử dụng mô hình local
env.allowRemoteModels = false;
env.allowRemoteFiles = false;

// Đặt thư mục cha của mô hình local
env.localModelPath = './models';

let nlp = null;

export const initModel = async () => {
    try {
        if (!nlp) {
            console.log("Loading local ONNX model...");

            nlp = await pipeline(
                'text-classification',
                'mbert_onnx'
                // ,{ progress_callback: console.log }
            );

            console.log("Local model loaded");
        }

        return nlp;
    } catch (err) {
        console.error("Error loading model:", err);
        throw err;
    }
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

// export const predict_label = async (req, res) => {
//     try {
//     const { text } = req.body;
//     if (!text || typeof text !== 'string') {
//         return res.status(400).json({ ec: 400, em: "Invalid input text" });
//     }
//     // Dự đoán
//     const result = await nlp(text); // luôn trả về mảng 1 phần tử
//     const id = parseInt(result[0].label.replace("LABEL_", ""));
//     const mapped =  {
//           id,
//           label: id2label[id],
//           score: result[0].score
//         };
//     res.status(200).json({ ec: 200, em: "Prediction successful", dt: mapped });
//     } catch (error) {
//         res.status(500).json({ ec: 500, em: error.message });
//     }
// };

export const preprocessText = (text) => {
    // 1. Thay URL bằng <URL>
    text = text.replace(/http\S+|www\S+|https\S+/gi, "<URL>");

    // 2. Thay email bằng <EMAIL>
    text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi, "<EMAIL>");

    // 3. Thay số bằng <NUM> (số nguyên, thập phân, số điện thoại, ...)
    text = text.replace(/\b\d+([.,]\d+)?\b/g, "<NUM>");

    // 4. Loại emoji và ký tự đặc biệt không cần thiết  
    // Giữ chữ cái, số, dấu câu cơ bản, dấu tiếng Việt, <>, ngoặc,...
    text = text.replace(
        /[^a-zA-Z0-9\s<>\-.,!?\/()":;'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/g,
        ""
    );

    // 5. Xóa khoảng trắng thừa
    text = text.trim().replace(/\s+/g, " ");

    return text;
}

export const predict_label = async (text) => {
    try {
    if (!text || typeof text !== 'string') {
        return { ec: 400, em: "Invalid input text" };
    }
    // Dự đoán
    const result = await nlp(text); // luôn trả về mảng 1 phần tử
    const id = parseInt(result[0].label.replace("LABEL_", ""));
    const mapped =  {
          id,
          label: id2label[id],
          score: result[0].score
        };
    return { ec: 200, em: "Prediction successful", dt: mapped };
    } catch (error) {
        return { ec: 500, em: error.message };
    }
};

