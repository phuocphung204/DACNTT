import { configureStore } from '@reduxjs/toolkit';
import requestsReducer from './request-slice';

const store = configureStore({
  reducer: {
    requests: requestsReducer,
  },
});

export default store;
