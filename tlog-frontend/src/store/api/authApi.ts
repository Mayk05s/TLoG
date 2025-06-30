import { apiSlice } from './apiSlice';
import { setCredentials } from '../authSlice';
import type { LoginResponse } from '../types';

export interface SignupRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({
            user: data.user,
            token: data.accessToken,
            refreshToken: data.refreshToken,
          }));
        } catch (error) {
          //todo
        }
      },
      invalidatesTags: ['Auth'],
    }),

    signup: builder.mutation<LoginResponse, SignupRequest>({
      query: (userData) => ({
        url: '/auth/signup',
        method: 'POST',
        body: userData,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({
            user: data.user,
            token: data.accessToken,
            refreshToken: data.refreshToken,
          }));
        } catch (error) {
          // todo
        }
      },
      invalidatesTags: ['Auth'],
    }),

    refresh: builder.mutation<LoginResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
  }),
});

export const { useLoginMutation, useSignupMutation, useRefreshMutation } = authApi;
