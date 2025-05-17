import api from "@/api/axios";

// Define the expected response type for type safety (if using TypeScript)
export interface IbkrConnectionResponse {
  isAuthenticated: boolean;
}

// API function to verify IBKR connection
export async function getIbkrConnection(): Promise<IbkrConnectionResponse> {
  try {
    const response = await api.get("/ibkr/auth/verify");
    return response.data;
  } catch (error) {
    throw new Error("Failed to verify IBKR connection");
  }
}