import { backendApi } from "./backend-api";

const buildFilterParams = (filter) => {
  if (!filter || Object.keys(filter).length === 0) return undefined;
  return JSON.stringify(filter);
};

const accountServices = backendApi.injectEndpoints({
  endpoints: (build) => ({
    getAccounts: build.query({
      query: ({ page = 1, limit = 10, filter = {} }) => {
        const filterParam = buildFilterParams(filter);
        return ({
          url: "/accounts",
          method: "GET",
          params: {
            page,
            limit,
            ...(filterParam ? { filter: filterParam } : {}),
          },
        });
      },
      providesTags: (result) => {
        const items = result?.dt?.accounts || [];
        const listTag = [{ type: "Account", id: "LIST" }];
        if (!Array.isArray(items)) return listTag;
        return listTag.concat(items.map((item) => ({ type: "Account", id: item?._id })));
      },
    }),
    getAccountById: build.query({
      query: (accountId) => ({
        url: `/accounts/${accountId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, accountId) => [{ type: "Account", id: accountId }],
    }),
    createAccount: build.mutation({
      query: (payload) => ({
        url: "/accounts",
        method: "POST",
        data: payload,
      }),
      invalidatesTags: [{ type: "Account", id: "LIST" }],
    }),
    updateAccount: build.mutation({
      query: ({ accountId, payload }) => ({
        url: `/accounts/${accountId}`,
        method: "PATCH",
        data: payload,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Account", id: "LIST" },
        { type: "Account", id: arg?.accountId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAccountsQuery,
  useGetAccountByIdQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
} = accountServices;
