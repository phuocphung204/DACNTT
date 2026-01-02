import { backendApi } from "./backend-api";

export const dashboardService = backendApi.injectEndpoints({
  endpoints: (build) => ({
    getAdvancedDashboard: build.query({
      query: (params) => ({
        url: "/dashboard/advanced",
        method: "GET",
        params,
      }),
    }),

    getDepartmentDashboard: build.query({
      query: ({ departmentId, params }) => ({
        url: `/dashboard/department/${departmentId}`,
        method: "GET",
        params,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAdvancedDashboardQuery,
  useGetDepartmentDashboardQuery,
} = dashboardService;
