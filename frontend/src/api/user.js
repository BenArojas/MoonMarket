import axios from "axios";
const baseUrl = "http://localhost:8000";

export async function RegisterUser(user) {
  const newUser = await axios.post(`${baseUrl}/register`, user);
  return newUser;
}

export async function getUserData(token) {
  const user = await axios.get(`${baseUrl}/user/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return user.data;
}

export async function getUserName(token) {
  const userName = await axios.get(`${baseUrl}/user/name`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return userName;
}

export async function loginUser(email, password) {
  const response = await axios.post(`${baseUrl}/auth/login`, {
    email,
    password,
  });
  return response;
}

export async function refreshJwtKey(token) {
  const response = await axios.post(
    "http://localhost:8000/auth/refresh",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response;
}

export async function addUserPurchase({price, ticker, quantity, token}) {
  
  const response = await axios.post(
    `${baseUrl}/transaction/buy_stock`,
    null, // Set the request body to null if your API doesn't expect a request body
    {
      params: { price, ticker, quantity }, // Send the required fields as query parameters
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

export async function addUserSale({ticker, quantity, price, token}) {
  
  const response = await axios.post(
    `${baseUrl}/transaction/sell_stock`,
    null, // Set the request body to null if your API doesn't expect a request body
    {
      params: { ticker, quantity, price }, // Send the required fields as query parameters
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

export async function addStockToPortfolio(
  portfolioStock,
  price,
  quantity,
  token
) {
  const ticker = portfolioStock.ticker;
  const stock = await axios.post(
    `${baseUrl}/stocks/add_stock`,
    portfolioStock,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const user = await axios.post(
    `${baseUrl}/transaction/buy_stock`,
    null, // Set the request body to null if your API doesn't expect a request body
    {
      params: { price, ticker, quantity }, // Send the required fields as query parameters
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export async function updateUsername(newUsername, token) {
  const UpdatePayload = {
    username: newUsername,
  };
  const response = await axios.patch(`${baseUrl}/user/update`, UpdatePayload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response;
}

export async function changePassword(oldPassword, newPassword, token) {
  const passwordPayload = {
    password: oldPassword,
    new_password: newPassword,
  };
  const response = await axios.patch(
    `${baseUrl}/user/change_password`,
    passwordPayload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response;
}

export async function addDeposit(money, token) {
  const currentDate = new Date().toISOString();
  const depositPayload = {
    amount: money,
    date: currentDate,
  };

  try {
    const response = await axios.post(
      `${baseUrl}/user/add_deposit`,
      depositPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error adding deposit:", error);
    throw error;
  }
}

export async function searchUser(username, token) {
  try {
    const response = await axios.get(
      `${baseUrl}/user/user_friend/${username}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}
