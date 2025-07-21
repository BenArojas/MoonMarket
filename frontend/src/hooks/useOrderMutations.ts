// In your useOrderMutations.ts file

import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import { AxiosError } from 'axios';

// Define the shape of the order part of the payload
interface OrderPayload {
  conid: number;
  orderType: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  tif: string;
  price?: number;
}

// --- FIX: Define a single object for the mutation variables ---
interface PreviewOrderVariables {
  accountId: string;
  order: OrderPayload;
}

interface ErrorDetail {
  detail?: string;
}

// Hook to preview an order
export const usePreviewOrder = () => {
  // Use the new variables interface
  return useMutation<any, AxiosError<ErrorDetail>, PreviewOrderVariables>({
    // --- FIX: mutationFn accepts ONE object, which we destructure ---
    mutationFn: ({ accountId, order }) => 
      // --- FIX: Use correct axios syntax ---
      api.post(
        '/transactions/orders/preview', // URL
        order,                          // Request Body
        { params: { accountId } }       // Axios config with URL query parameters
      ),
  });
};

// Hook to place an order (apply the same logic)
export const usePlaceOrder = () => {
  return useMutation<any, AxiosError<ErrorDetail>, PreviewOrderVariables>({
    mutationFn: ({ accountId, order }) => 
      api.post(
        '/transactions/orders', 
        order, 
        { params: { accountId } }
      ),
  });
};

// Hook to reply to a confirmation (This one is likely fine as is)
export const useConfirmOrder = () => {
  return useMutation<any, AxiosError<ErrorDetail>, any>({
    mutationFn: ({ replyId, confirmed }: { replyId: string, confirmed: boolean }) =>
      api.post(`/transactions/orders/reply/${replyId}`, { confirmed }),
  });
};

export const useAccountSummary = (accountId: string | null) => {
  return useQuery({
    queryKey: ["accountSummary", accountId],
    queryFn: async () => {
      const { data } = await api.get(`/account/accounts/${accountId}/summary`);
      return data;
    },
    enabled: !!accountId,
    staleTime: 1000 * 60 * 2, 
  });
};