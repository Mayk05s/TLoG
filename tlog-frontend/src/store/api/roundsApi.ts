import { apiSlice } from './apiSlice';
import type { Round, RoundDetailsResponse } from '../types';

export const roundsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRounds: builder.query<Round[], void>({
      query: () => '/rounds',
      providesTags: ['Round'],
    }),

    getRound: builder.query<RoundDetailsResponse, string>({
      query: (id) => `/rounds/${id}`,
      providesTags: (_, __, id) => [{ type: 'Round', id: id }],
    }),

    createRound: builder.mutation<Round, void>({
      query: () => ({
        url: '/rounds',
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['Round'],
    }),
  }),
});

export const {
  useGetRoundsQuery,
  useGetRoundQuery,
  useCreateRoundMutation
} = roundsApi;
