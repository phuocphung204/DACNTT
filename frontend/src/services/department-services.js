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
  }),
  overrideExisting: false,
});

export const {
  useGetDepartmentsQuery,
  useGetAllLabelsQuery,
} = departmentService;
