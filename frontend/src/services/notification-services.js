import { backendApi } from "./backend-api.js";

const notificationServices = backendApi.injectEndpoints({
  endpoints: (build) => ({
    getMyNotifications: build.query({
      query: (params) => ({
        url: "/notifications/my-notifications",
        method: "GET",
        params,
      }),
    }),
    markNotificationAsRead: build.mutation({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: "PATCH",
      }),
    }),
    markAllNotificationsAsRead: build.mutation({
      query: () => ({
        url: "/notifications/read-all",
        method: "PATCH",
      }),
    }),
    deleteNotification: build.mutation({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}`,
        method: "DELETE",
      }),
    }),
    getUnreadNotificationsCount: build.query({
      query: () => ({
        url: "/notifications/unread-count",
        method: "GET",
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyNotificationsQuery,
  useLazyGetMyNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useGetUnreadNotificationsCountQuery,
} = notificationServices;
