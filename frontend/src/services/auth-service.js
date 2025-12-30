import { logout, setCredentials } from "#redux/auth-slice";
import { connectSocket, disconnectSocket } from "./axios-config";
import { backendApi } from "./backend-api"

export const authService = backendApi.injectEndpoints({
  endpoints: (build) => ({
    registerUser: build.mutation({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        data: userData,
      }),
    }),

    /**
     * credentials: { email, password }
     */
    login: build.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        data: credentials,
      }),
      invalidatesTags: ["User"],
      onQueryStarted: (_, { dispatch, queryFulfilled }) => {
        queryFulfilled.then(({ data }) => {
          const token = data.dt?.token;
          dispatch(setCredentials({ token, role: data.dt?.role }));
          connectSocket(token);
        }).catch((error) => {
          console.error("Login failed: ", error);
        });
      },
    }),

    logout: build.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error("Logout failed: ", error);
        } finally {
          backendApi.util.resetApiState();
          disconnectSocket();
          dispatch(logout());
        }
      },
    }),

    getMyProfile: build.query({
      query: () => ({
        url: "/accounts/me",
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    resetPasswordRequest: build.mutation({
      query: (payload) => ({
        url: '/auth/reset-password',
        method: 'POST',
        data: payload,
      }),
    }),

    confirmResetPassword: build.mutation({
      query: (payload) => ({
        url: '/auth/reset-password/confirm',
        method: 'POST',
        data: payload,
      }),
    }),
  }),

  overwriteExistingEndpoints: false,
})

export const {
  useRegisterUserMutation,
  useLoginMutation,
  useLogoutMutation,

  useResetPasswordRequestMutation,
  useConfirmResetPasswordMutation,

  useGetMyProfileQuery,
} = authService;

