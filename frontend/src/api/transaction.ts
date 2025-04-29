import api from "@/api/axios";
import { AxiosError } from "axios";



export async function getUserTransactions() {
  const transactions = await api.get(`/user/user_transactions`);
  return transactions.data;
}

export async function deleteTransaction(transactionId: string) {
  try {
    const response = await api.delete(`/transaction/delete_transaction/${transactionId}`);
    return response.data;
  } catch (error) {
    // Handle specific error cases from our backend
    if (error instanceof AxiosError && error.response) {
      throw new Error(error.response.data.detail || 'Failed to delete transaction');
    }
    throw new Error('Network error while deleting transaction');
  }
}