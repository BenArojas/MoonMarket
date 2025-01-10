import api from "@/api/axios";



export async function getUserTransactions() {

    const transactions = await api.get(`/user/user_transactions`);
    return transactions.data;
  }
  export async function deleteTransaction( transactionId ) {
    try {
      const response = await api.delete(`/transaction/delete_transaction/${transactionId}`); // Note: removed 's' from transactions
      return response.data;
    } catch (error) {
      // Handle specific error cases from our backend
      if (error.response) {
        throw new Error(error.response.data.detail || 'Failed to delete transaction');
      }
      throw new Error('Network error while deleting transaction');
    }
  }