import { apiSlice } from './apiSlice';

export interface TapResponse {
  points: number;
  totalPoints: number;
}

export const tapsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    submitTap: builder.mutation<TapResponse, string>({
      query: (roundId) => ({
        url: `/tap/${roundId}`,
        method: 'POST',
      }),
      invalidatesTags: (_, __, roundId) => [
        { type: 'Round', id: `${roundId}-stats` },
        'Round',
      ],
    }),
  }),
});

export const { useSubmitTapMutation } = tapsApi;
