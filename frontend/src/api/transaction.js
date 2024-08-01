import axios from "axios";
const baseUrl = "http://localhost:8000";


export async function getUserTransactions(token) {

    const transactions = await axios.get(`${baseUrl}/user/user_transactions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return transactions.data;
  }