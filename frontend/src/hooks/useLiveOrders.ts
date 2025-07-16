import { cancelOrder, getLiveOrders, modifyOrder } from "@/api/transaction";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useLiveOrders = () => {
    const queryClient = useQueryClient();

    const { data: liveOrders = [], isLoading, error } = useQuery({
        queryKey: ["liveOrders"],
        queryFn: getLiveOrders,
    });

    const cancelMutation = useMutation({
        mutationFn: cancelOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['liveOrders'] });
        },
    });

    const modifyMutation = useMutation({
        mutationFn: modifyOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['liveOrders'] });
        },
    });

    return { liveOrders, isLoading, error, cancelMutation, modifyMutation };
};