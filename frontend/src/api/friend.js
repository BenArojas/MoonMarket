
import api from "@/api/axios";

export async function sendFriendRequest(username ) {
  try {
    const response = await api.post(
      `/friend/send_friend_request/${username}`,
      {}
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getFriendRequest() {
  try {
    const response = await api.get(
      `/friend/pending_friend_requests`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function answerFriendRequest(requestId, action, ) {
  try {
    const response = await api.post(
      `/friend/handle_friend_request/${requestId}`,
      { action }, // Send action in the request body
      {
        params: { action }, // Also include action as a query parameter
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getFriendsAndUserHoldings() {
  try {
    const response = await api.get(`/friend/get_friends_and_user_holdings`, );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getFriendList() {
  try {
    const response = await api.get(`/friend/get_friendList`);
    return response.data;
  } catch (error) {
    throw error;
  }
}