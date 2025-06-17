import api from "@/api/axios";
import { Transaction } from "@/hooks/useTransactionSummary";
import { AxiosError } from "axios";



export async function getUserTransactions(days = 90) {
  const { data } = await api.get<Transaction[]>(
    "/transactions",
    { params: { days } }          // backend default is also 90 so this is optional
  );
  return data;
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