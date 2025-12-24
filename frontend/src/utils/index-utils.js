export const getParamsWithArrays = (searchParams) => {
  const params = {};

  // Duyệt qua từng cặp key-value
  searchParams.forEach((value, key) => {
    if (params[key]) {
      // Nếu key đã tồn tại:
      // 1. Nếu nó chưa là mảng -> chuyển thành mảng
      if (!Array.isArray(params[key])) {
        params[key] = [params[key]];
      }
      // 2. Push giá trị mới vào
      params[key].push(value);
    } else {
      // Nếu key chưa tồn tại -> gán bình thường
      params[key] = value;
    }
  });

  return params;
};

export const updateParams = (prevParams, key, anyValue) => {
  const nextParams = new URLSearchParams(prevParams);
  console.log("Updating params:", anyValue);
  // Bước 1: Luôn xóa key cũ trước (dù mảng rỗng hay không)
  nextParams.delete(key);

  // Bước 2: Nếu mảng có dữ liệu thì mới thêm vào
  if (Array.isArray(anyValue) && anyValue.length > 0) {
    anyValue.forEach(value => {
      if (value !== "" && value != null) {
        nextParams.append(key, value);
      }
    });
  } else if (typeof anyValue === "string" && anyValue !== "") {
    // Nếu không phải mảng thì thêm giá trị bình thường
    nextParams.set(key, anyValue);
  }
  return nextParams;
};

export const getValuesFromParams = (searchParams, paramArr = []) => {
  const params = {};
  paramArr.forEach((key) => {
    const values = searchParams.getAll(key);
    if (values.length > 0) {
      params[key] = values;
    }
  });
  return params;
}

export * from "./format";
export * from "./parse";