import { configureStore } from "@reduxjs/toolkit";

import { backendApi } from "#services/backend-api";
import { authReducter, requestsReducer, filterReducer } from "#redux";

const store = configureStore({
  reducer: {
    requests: requestsReducer,
    auth: authReducter,
    filter: filterReducer,
    [backendApi.reducerPath]: backendApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(backendApi.middleware),
});

export default store;
