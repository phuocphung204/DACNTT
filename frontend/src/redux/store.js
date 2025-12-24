import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

import { backendApi } from "#services/backend-api";
import { authReducter, requestsReducer, filterReducer } from "#redux";

const rootReducer = combineReducers({
  requests: requestsReducer,
  auth: authReducter,
  filter: filterReducer,
  [backendApi.reducerPath]: backendApi.reducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "filter"],
  blacklist: [backendApi.reducerPath], // KHÔNG persist RTK Query cache
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // để khỏi cảnh báo redux-persist
    }).concat(backendApi.middleware),
});

export const persistor = persistStore(store);
export default store;