import api, {authCheckApi} from "@/api/axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export async function RegisterUser(user) {
  const newUser = await api.post(`/register`, user);
  return newUser;
}

export async function getUserData() {
  const user = await api.get(`/user/`);
  return user.data;
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

export async function addUserPurchase({ price, ticker, quantity, date }) {
  const response = await api.post(
    `/transaction/buy_stock`,
    null, // Set the request body to null if your API doesn't expect a request body
    {
      params: { price, ticker, quantity, transaction_date: date.toISOString()  }, // Send the required fields as query parameters
    }
  );
  return response.data;
}

export async function addUserSale({ ticker, quantity, price, date }) {
  const response = await api.post(
    `/transaction/sell_stock`,
    null, // Set the request body to null if your API doesn't expect a request body
    {
      params: { ticker, quantity, price, transaction_date: date.toISOString()  }, // Send the required fields as query parameters
    }
  );
  return response.data;
}

export async function addStockToPortfolio(
  portfolioStock,
  price,
  quantity,
  date
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
        transaction_date: date.toISOString() 
      },
    }
  );
}

export async function updateUsername(newUsername) {
  const response = await api.patch(`/user/update-username`, null,
    {
      params:
        { new_username: newUsername }
    });
  toast.success("Username updated successfully");
  return response;

}

export async function changePassword(oldPassword, newPassword) {
  const passwordPayload = {
    password: oldPassword,
    new_password: newPassword,
  };
  const response = await api.patch(`/user/change_password`, passwordPayload);
  toast.success("Password changed successfully");
  return response;
}

export async function addDeposit(money) {
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

export async function searchUser(username,) {
    const response = await api.get(
      `/user/user_friend/${username}`
    );
    return response.data;
}


export async function checkAuth() {
  try {
    const response = await authCheckApi.get("/auth/protected-route");
    return response.data;
  } catch (error) {
    return null;
  }
}

export async function addApiKey(api_key) {
  try {
      const response = await api.post(`/api-key/add-api-key`, null, {
          params: { api_key } // Send api_key as a query parameter
      });
      return response.data;
  } catch (error) {
      throw error;
  }
}

export async function getUsersList() {
  try {
    const response = await api.get(`/user/users_list`);
    return response.data;
  } catch (error) {
    throw error;
  }
}
