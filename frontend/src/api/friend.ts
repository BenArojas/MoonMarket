
import api from "@/api/axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export async function sendFriendRequest(username: string) {
  try {
    const response = await api.post(
      `/friends/send_friend_request/${username}`,
      {}
    );
    toast.success("Friend request sent successfully");
    return response.data;
  } catch (error) {
    // toast.error("Error while adding friend");
    throw error;
  }
}

export async function getFriendRequestLength() {
  try {
    const response = await api.get(
      `/friends/pending_friend_requests_length`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getFriendRequestUsers() {
  try {
    const response = await api.get(
      `/friends/pending_friend_requests_users`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getSentFriendRequest() {
  try {
    const response = await api.get(
      `/friends/sent_friend_requests`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

interface AnswerFriendRequestProps{
  request_Id: string;
  answer: string
}
export async function answerFriendRequest({ request_Id, answer }: AnswerFriendRequestProps) {
  try {
    const response = await api.post(
      `/friends/handle_friend_request/${request_Id}`,
      { answer }, 
      {
        params: { answer }, 
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getFriendsAndUserHoldings() {
  try {
    const response = await api.get(`/friends/get_friends_and_user_holdings`, );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getFriendList() {
  try {
    const response = await api.get(`/friends/get_friendList`);
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function removeFriend(friend_id: string) {
  try {
    const response = await api.delete(`/friends/remove-friend/${friend_id}`);
    toast.success("Friend removed successfully");
    return response.data;
  } catch (error) {
    toast.error("couldn't remove Friend ");
    throw error;
  }
}