import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  list: [],
  statusFilter: "all",
};

const requestSlice = createSlice({
  name: "requests",
  initialState,
  reducers: {
    setRequests(state, action) {
      state.list = action.payload;
    },
    setStatusFilter(state, action) {
      state.statusFilter = action.payload;
    },
  },
});

export const { setRequests, setStatusFilter } = requestSlice.actions;

export default requestSlice.reducer;
