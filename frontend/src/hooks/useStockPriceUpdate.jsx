import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateStockPrices } from '@/api/stock';

export const useStockPriceUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tickers) => {
      return updateStockPrices(tickers);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['authStatus'] });
    },
  });
};