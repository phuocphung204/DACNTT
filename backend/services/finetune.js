import { env, AutoTokenizer } from '@xenova/transformers';
import * as ort from 'onnxruntime-web';

// ort.env.wasm.numThreads = 1;
// ort.env.wasm.simd = true;
// Đặt cấu hình môi trường để chỉ sử dụng mô hình local
env.allowRemoteModels = false;
env.allowRemoteFiles = false;

// Đặt thư mục cha của mô hình local
env.localModelPath = './models';

let tokenizer = null;
let session = null;

export const initModel = async () => {
  if (!tokenizer) {
    tokenizer = await AutoTokenizer.from_pretrained('mbert_onnx');
  }

  if (!session) {
    session = await ort.InferenceSession.create(
      'models/mbert_onnx/model_multitask.onnx'
    );
  }
  console.log("Loaded successfully model.");
};

const softmax = (arr, T = 1) => {
  const max = Math.max(...arr);
  const exps = arr.map(x => Math.exp((x - max) / T));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

const id2label_category = {
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
const id2label_priority = {
  0: "Critical",
  1: "High",
  2: "Low", // Tại encode nên Low = 2 thui, đừng lo đọc model ko ảnh hưởng phần code request
  3: "Medium"
};


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
};

export const predict_label = async (text) => {
  try {

    const inputs = await tokenizer(text, {
      padding: true,
      truncation: true,
      return_tensors: 'np'
    });

    const feeds = {
      input_ids: new ort.Tensor(
        'int64',
        BigInt64Array.from(inputs.input_ids.data),
        inputs.input_ids.dims
      ),
      attention_mask: new ort.Tensor(
        'int64',
        BigInt64Array.from(inputs.attention_mask.data),
        inputs.attention_mask.dims
      )
    };

    const output = await session.run(feeds);

    const [catName, priName] = session.outputNames;

    const logitsCategory = Array.from(output[catName].data);
    const logitsPriority = Array.from(output[priName].data);

    const probsCategory = softmax(logitsCategory);
    const probsPriority = softmax(logitsPriority);

    const catId = probsCategory.indexOf(Math.max(...probsCategory));
    const priId = probsPriority.indexOf(Math.max(...probsPriority));

    return {
      ec: 200,
      em: "Prediction successful",
      dt: {
        category: {
          id: catId,
          label: id2label_category[catId],
          score: probsCategory[catId]
        },
        priority: {
          id: priId,
          label: id2label_priority[priId],
          score: probsPriority[priId]
        }
      }
    };
  } catch (err) {
    console.error("predict_label error:", err);
    return { ec: 500, em: err.message };
  }
};