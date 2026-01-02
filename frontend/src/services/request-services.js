import { backendApi } from "./backend-api";
import { BASE_URL, getUserToken } from "./axios-config";

const getAuthHeaders = () => {
  const token = getUserToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const requestService = backendApi.injectEndpoints({
  endpoints: (build) => ({
    getRequests: build.query({
      query: (params) => ({
        url: "/requests",
        method: "GET",
        params,
      }),
    }),
    getRequestById: build.query({
      query: (requestId) => ({
        url: `/requests/${requestId}`,
        method: "GET",
      }),
    }),
    applyPredictionByRequestId: build.mutation({
      query: ({ requestId, assignedTo }) => ({
        url: `/requests/use-prediction/${requestId}`,
        method: "PUT",
        data: { assigned_to: assignedTo },
      }),
    }),
    assignRequestToOfficer: build.mutation({
      query: ({ requestId, payload }) => ({
        url: `/requests/assign/${requestId}`,
        method: "PUT",
        data: payload,
      }),
    }),

    searchKnowledgeBase: build.query({
      query: (params) => ({
        url: "/requests/knowledge-base/search",
        method: "GET",
        params,
      }),
    }),

    sendReminder: build.mutation({
      query: ({ requestId, subject, studentEmail }) => ({
        url: `/requests/${requestId}/remind`,
        method: "POST",
        data: {
          subject,
          student_email: studentEmail,
        },
      }),
    }),
    downloadAttachment: build.mutation({
      async queryFn({ requestId, attachmentId }) {
        try {
          const response = await fetch(
            `${BASE_URL}/requests/${requestId}/attachments/${attachmentId}`,
            { headers: getAuthHeaders() }
          );
          if (!response.ok) {
            return {
              error: {
                status: response.status,
                message: "Không thể tải tệp đính kèm",
              },
            };
          }
          const blob = await response.blob();
          return { data: blob };
        } catch (error) {
          return {
            error: {
              message: error?.message || "Không thể tải tệp đính kèm",
            },
          };
        }
      },
    }),

    getConversation: build.query({
      query: (requestId) => ({
        url: `/requests/${requestId}/conversation`,
        method: "GET",
      }),
    }),

    // Các endpoint cho Officer
    getMyAssignedRequests: build.query({
      query: (params) => ({
        url: "/requests/my-assigned-requests",
        method: "GET",
        params,
      }),
    }),
    getMyAssignedRequestsForManage: build.query({
      query: (params) => ({
        url: "/requests/my-assigned-requests/manage",
        method: "GET",
        params,
      }),
    }),

    sendMailToStudent: build.mutation({
      query: ({ requestId, payload }) => ({
        url: `/requests/${requestId}/send-mail`,
        method: "POST",
        data: payload,
      }),
    }),

    replyToStudent: build.mutation({
      query: ({ requestId, payload }) => ({
        url: `/requests/${requestId}/reply`,
        method: "POST",
        data: payload,
      }),
    }),

  }),

  overrideExisting: false,
});

export const {
  useGetRequestsQuery,
  useGetRequestByIdQuery,
  useApplyPredictionByRequestIdMutation,
  useAssignRequestToOfficerMutation,
  useSendReminderMutation,
  useDownloadAttachmentMutation,
  useGetConversationQuery,
  useSearchKnowledgeBaseQuery,

  // Các endpoint cho Officer
  useGetMyAssignedRequestsQuery,
  useGetMyAssignedRequestsForManageQuery,
  useSendMailToStudentMutation,
  useReplyToStudentMutation,
} = requestService;
