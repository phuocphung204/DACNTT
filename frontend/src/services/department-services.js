import { backendApi } from "./backend-api";

export const departmentService = backendApi.injectEndpoints({
  endpoints: (build) => ({
    getDepartments: build.query({
      query: () => ({
        url: "/departments",
        method: "GET",
      }),
    }),
    getOfficersByDepartment: build.query({
      query: (departmentId) => ({
        url: `/accounts/department/${departmentId}`,
        method: "GET",
      }),
    }),
    getAllLabels: build.query({
      query: () => ({
        url: "/departments/labels",
        method: "GET",
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDepartmentsQuery,
  useGetOfficersByDepartmentQuery,
  useGetAllLabelsQuery,
} = departmentService;
