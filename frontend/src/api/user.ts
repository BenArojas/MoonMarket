import api from "@/api/axios";
import { Dayjs } from "dayjs";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


type Deposit = {
  amount: number;
  date: string
}
export interface RegisterUser {
  email: string;
  username: string
  password: string
  deposits: Deposit[]
}

export async function RegisterUser(user: RegisterUser) {
  const newUser = await api.post(`/register`, user);
  return newUser;
}

export async function getUserData() {
  const user = await api.get(`/user/`);
  return user.data;
}
export async function getUserInsights() {
  try {
    const response = await api.get("/user/ai/insights");
    return response;
  } catch (error) {
    console.error("API Error in getUserInsights:", error);
    throw error; // Re-throw to handle in fetchInsights
  }
}

export async function getStockSentiment(ticker: string) {
  try {
    const response = await api.get(`/user/ai/sentiment/${ticker.toUpperCase()}`);
    return response;
  } catch (error) {
    console.error("Error fetching sentiment:", error);
    throw error; // Re-throw to handle in fetchInsights
  }
}
export async function getUserName() {
  const userName = await api.get(`/user/name`);
  return userName.data;
}

export async function getUserHoldings() {
  const holdings = await api.get(`/user/holdings`);
  return holdings.data;
}

export async function getUserStocks() {
  const stocks = await api.get(`/user/stocks`);
  return stocks.data;
}

interface ActionShares {
  price: number;
  ticker: string;
  quantity: number;
  date: Dayjs;
  commission: number
}
export async function addUserPurchase({ price, ticker, quantity, date, commission }: ActionShares) {
  const response = await api.post(
    `/transaction/buy_stock`,
    null, // Set the request body to null if your API doesn't expect a request body
    {
      params: { price, ticker, quantity, transaction_date: date.toISOString(), commission }, // Send the required fields as query parameters
    }
  );
  return response.data;
}

export async function addUserSale({ ticker, quantity, price, date, commission }: ActionShares) {
  const response = await api.post(
    `/transaction/sell_stock`,
    null, // Set the request body to null if your API doesn't expect a request body
    {
      params: { ticker, quantity, price, transaction_date: date.toISOString(), commission }, // Send the required fields as query parameters
    }
  );
  return response.data;
}

export interface PortfolioStock {
  name: string;
  ticker: string;
  price: string;
  earnings?: string
}

export async function addStockToPortfolio(
  portfolioStock: PortfolioStock,
  price: number,
  quantity: number,
  commission: number,
  date: Date
) {
  const ticker = portfolioStock.ticker;
  const stock = await api.post(
    `/stock/add_stock`,
    portfolioStock,
  );

  const user = await api.post(
    `/transaction/buy_stock`,
    null,
    {
      params: {
        price,
        ticker,
        quantity,
        commission,
        transaction_date: date.toISOString()
      },
    }
  );
  return user
}

export async function updateUsername(newUsername: string) {
  const response = await api.patch(`/user/update-username`, null,
    {
      params:
        { new_username: newUsername }
    });
  toast.success("Username updated successfully");
  return response;

}

export async function changePassword({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) {
  const passwordPayload = {
    password: oldPassword,
    new_password: newPassword,
  };
  const response = await api.patch(`/user/change_password`, passwordPayload);
  toast.success("Password changed successfully");
  return response;
}

export type ChangeTierPayload = {
  account_type: string;
  billing_cycle?: string
}
interface ChangeAccountTierProps {
  userId: string;
  payload: ChangeTierPayload
}
export async function changeAccountTier({ userId, payload }: ChangeAccountTierProps) {
  const response = await api.post(`/user/toggle-tier/${userId}`, payload)
  return response.data
}

export async function addDeposit(money: number) {
  const currentDate = new Date().toISOString();
  const depositPayload = {
    amount: money,
    date: currentDate,
  };
  const response = await api.post(
    `/user/add_deposit`,
    depositPayload,
  );
  toast.success("Deposit added successfully");
  return response.data;
}

export async function searchUser(username: string) {
  const response = await api.get(
    `/user/user_friend/${username}`
  );
  return response.data;
}

type ApiKeyData = {
  taxRate: number;
  api_provider: string
  apiKey?: string;
}

export async function addApiKey(data: ApiKeyData) {
  const response = await api.post(`/user/complete-setup`, data);
  return response.data;
}

export async function getUsersList() {
  try {
    const response = await api.get(`/user/users_list`);
    return response.data;
  } catch (error) {
    throw error;
  }
}
