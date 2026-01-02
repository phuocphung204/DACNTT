import { createApi } from "@reduxjs/toolkit/query/react"
import { axiosBaseQuery } from "./axios-config"

export const backendApi = createApi({
  reducerPath: "backend-api",
  baseQuery: axiosBaseQuery(),
  keepUnusedDataFor: 300, // Giữ cache 5 phút
  refetchOnFocus: false,  // Không refetch khi đổi tab
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: false,
  tagTypes: [
    "User",
    "Account",
    "Department",
    "Officers",
    "Labels",
    "KnowledgeBase",
    "Request",
    "RequestConversation",
  ],
  endpoints: () => ({}),
})
