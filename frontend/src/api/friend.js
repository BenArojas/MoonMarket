import axios from "axios";

export async function sendFriendRequest(username, token) {
  try {
    const response = await axios.post(
      `http://localhost:8000/friend/send_friend_request/${username}`,
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
      `http://localhost:8000/friend/pending_friend_requests`,
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
      `http://localhost:8000/friend/handle_friend_request/${requestId}`,
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

export async function getFriends(token) {
  try {
    const response = await axios.get(`http://localhost:8000/friend/get_friends`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}
