import { backendApi } from "./backend-api";

export const departmentService = backendApi.injectEndpoints({
  endpoints: (build) => ({
    getDepartments: build.query({
      query: () => ({
        url: "/departments",
        method: "GET",
      }),
    }),
    getAllLabels: build.query({
      query: () => ({
        url: "/departments/labels",
        method: "GET",
      }),
      providesTags: ["Labels"],
    }),
    updateDepartment: build.mutation({
      query: ({ departmentId, payload }) => ({
        url: `/departments/${departmentId}`,
        method: "PUT",
        data: payload,
      }),

      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        console.log("Starting update for department:", arg);
      }
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDepartmentsQuery,
  useGetAllLabelsQuery,
  useUpdateDepartmentMutation,
} = departmentService;
