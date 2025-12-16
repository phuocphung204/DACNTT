import { createSlice } from "@reduxjs/toolkit";

export const TOKEN_KEY_NAME = "authToken";

const initialState = {
  token: localStorage.getItem(TOKEN_KEY_NAME) || null, // Lấy từ localStorage nếu F5
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY_NAME),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem(TOKEN_KEY_NAME, action.payload.token);
    },

    logout(state) {
      Object.assign(state, initialState);
      localStorage.removeItem(TOKEN_KEY_NAME);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;