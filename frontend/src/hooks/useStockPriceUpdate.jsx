import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateStockPrice } from '@/api/stock';

export const useStockPriceUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tickers) => {
      const promises = tickers.map((ticker) => updateStockPrice(ticker));
      return Promise.allSettled(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userData']);
    },
  });
};