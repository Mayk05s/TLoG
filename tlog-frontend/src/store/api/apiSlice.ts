import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

const API_BASE_URL = 'http://localhost:3001';

interface TokenConfig {
  token?: string;
  tokenType?: 'access' | 'refresh';
}

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { extra }) => {
    const tokenConfig = extra as TokenConfig | undefined;

    if (tokenConfig?.token) {
      headers.set('authorization', `Bearer ${tokenConfig.token}`);
    } else {
      const defaultToken = localStorage.getItem('accessToken');
      if (defaultToken) {
        headers.set('authorization', `Bearer ${defaultToken}`);
      }
    }

    return headers;
  },
});

const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Round', 'User', 'Tap', 'Auth'],
  endpoints: () => ({}),
});

