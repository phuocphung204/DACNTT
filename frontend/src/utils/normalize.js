export function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.toLowerCase();

  // 1. Chuẩn hóa unicode (tách dấu ra khỏi ký tự gốc)
  // Ví dụ: 'á' sẽ thành 'a' + dấu sắc
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 2. Xử lý các trường hợp đặc biệt của chữ đ/Đ
  str = str.replace(/đ/g, 'd').replace(/Đ/g, 'D');

  return str;
}