import { logout, setCredentials } from "#redux/auth-slice";
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
          dispatch(setCredentials({ token: data.token }));
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
          dispatch(logout());
        }
      },
    }),
  }),

  overwriteExistingEndpoints: false,
})

export const {
  useRegisterUserMutation,
  useLoginMutation,
  useLogoutMutation,
} = authService 
