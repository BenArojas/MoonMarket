import api from "@/api/axios";


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

// export async function loginUser(email, password) {
//   const response = await api.post(`/auth/login`, {
//     email,
//     password,
//   });
//   return response;
// }

// export async function refreshJwtKey(token) {
//   const response = await api.post(
//     "http://localhost:8000/auth/refresh",
//     {},
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     }
//   );
//   return response;
// }

export async function addUserPurchase({price, ticker, quantity}) {
  
  const response = await api.post(
    `/transaction/buy_stock`,
    null, // Set the request body to null if your API doesn't expect a request body
    {
      params: { price, ticker, quantity }, // Send the required fields as query parameters
    }
  );
  return response.data;
}

export async function addUserSale({ticker, quantity, price}) {
  
  const response = await api.post(
    `/transaction/sell_stock`,
    null, // Set the request body to null if your API doesn't expect a request body
    {
      params: { ticker, quantity, price }, // Send the required fields as query parameters
    }
  );
  return response.data;
}

export async function addStockToPortfolio(
  portfolioStock,
  price,
  quantity,
) {
  const ticker = portfolioStock.ticker;
  const stock = await api.post(
    `/stocks/add_stock`,
    portfolioStock,
  );
  const user = await api.post(
    `/transaction/buy_stock`,
    null, // Set the request body to null if your API doesn't expect a request body
    {
      params: { price, ticker, quantity }, // Send the required fields as query parameters
  
    }
  );
}

export async function updateUsername(newUsername) {
  const UpdatePayload = {
    username: newUsername,
  };
  const response = await api.patch(`/user/update`, UpdatePayload);
  return response;
}

export async function changePassword(oldPassword, newPassword) {
  const passwordPayload = {
    password: oldPassword,
    new_password: newPassword,
  };
  const response = await api.patch(
    `/user/change_password`,
    passwordPayload,

  );
  return response;
}

export async function addDeposit(money, ) {
  const currentDate = new Date().toISOString();
  const depositPayload = {
    amount: money,
    date: currentDate,
  };

  try {
    const response = await api.post(
      `/user/add_deposit`,
      depositPayload,
    );
    return response.data;
  } catch (error) {
    console.error("Error adding deposit:", error);
    throw error;
  }
}

export async function searchUser(username, ) {
  try {
    const response = await api.get(
      `/user/user_friend/${username}`,
     
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}
