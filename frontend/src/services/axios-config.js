import { TOKEN_KEY_NAME } from "#redux";
import axios from "axios";

export const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
})

axiosInstance.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    return response && response.data;
  }, (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    if (error?.code === "ERR_NETWORK") return Promise.reject({ ec: -1, em: "Lỗi mạng" })
    console.log(error);
    return error.response && error?.response?.data && Promise.reject(error?.response?.data);
  });

export const getUserToken = () => localStorage.getItem(TOKEN_KEY_NAME) || null;

export const axiosBaseQuery = ({ baseUrl } = { baseUrl: "" }) =>
  async ({ url, method, data, params, headers }) => {
    try {
      let token = getUserToken();
      if (token) {
        headers = {
          ...headers,
          Authorization: `Bearer ${token}`,
        };
      }

      const result = await axiosInstance({
        url: baseUrl + url,
        method,
        data,
        params,
        headers,
        withCredentials: true, // nếu cần cookie
      })
      return { data: result }
    } catch (axiosError) {
      return { error: axiosError }
    }
  };