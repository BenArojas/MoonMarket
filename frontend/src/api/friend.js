import axios from "axios";
const baseUrl = "http://localhost:8000"
export async function sendFriendRequest(username, token) {
  try {
    const response = await axios.post(
      `${baseUrl}/friend/send_friend_request/${username}`,
      {},
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

export async function getFriendRequest(token) {
  try {
    const response = await axios.get(
      `${baseUrl}/friend/pending_friend_requests`,
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

export async function answerFriendRequest(requestId, action, token) {
  try {
    const response = await axios.post(
      `${baseUrl}/friend/handle_friend_request/${requestId}`,
      { action }, // Send action in the request body
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: { action }, // Also include action as a query parameter
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getFriendsAndUserHoldings(token) {
  try {
    const response = await axios.get(`${baseUrl}/friend/get_friends_and_user_holdings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getFriendList(token) {
  try {
    const response = await axios.get(`${baseUrl}/friend/get_friendList`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}