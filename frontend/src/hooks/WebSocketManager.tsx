import { useEffect } from 'react';
import { useStockStore } from '@/stores/stockStore';
import api from '@/api/axios';

export const WebSocketManager = () => {
    // Get the selected accountId from your global Zustand store
    const selectedAccountId = useStockStore((state) => state.selectedAccountId);

    useEffect(() => {
        const connect = async (accountId: string) => {
            try {
                console.log(`Connecting WebSocket for account: ${accountId}...`);
                // Send the accountId as a query parameter
                await api.post(`/ws/connect?accountId=${accountId}`);
            } catch (error) {
                console.error("Failed to connect WebSocket:", error);
            }
        };

        const disconnect = async () => {
            try {
                console.log("Disconnecting WebSocket...");
                await api.post('/ws/disconnect');
            } catch (error) {
                console.error("Failed to disconnect WebSocket:", error);
            }
        };

        if (selectedAccountId) {
            // An account is selected, so establish the connection.
            // The backend service handles stopping any previous connection first.
            connect(selectedAccountId);
        }

        // The return function from useEffect is a cleanup function.
        // It runs when the component unmounts (logout) or when selectedAccountId changes.
        return () => {
            if (selectedAccountId) {
                // We disconnect when the account ID changes or on logout
                // to ensure we don't leave stale connections open.
                disconnect();
            }
        };

    // This effect hook will re-run whenever `selectedAccountId` changes.
    }, [selectedAccountId]);

    // This component renders nothing. It's purely for managing side effects.
    return null; 
};