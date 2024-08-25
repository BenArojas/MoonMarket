import api from "@/api/axios";



export async function getUserTransactions() {

    const transactions = await api.get(`/user/user_transactions`);
    return transactions.data;
  }