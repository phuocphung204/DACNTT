import { configureStore } from "@reduxjs/toolkit";

import { backendApi } from "#services/backend-api";
import { authReducter, requestsReducer } from "#redux";

const store = configureStore({
  reducer: {
    requests: requestsReducer,
    auth: authReducter,
    [backendApi.reducerPath]: backendApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(backendApi.middleware),
});

export default store;
