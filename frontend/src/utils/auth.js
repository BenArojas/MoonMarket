import {checkAuth} from '@/api/user'
import { redirect } from "react-router-dom";
export async function requireAuth() {
    const response = await checkAuth();
    if (!response) {
      throw redirect("/login"); // Redirect to login page if the user is not authenticated
    }
    return response;
  }

  export async function requireAnonymous() {
    const user = await checkAuth();
    if (user) throw redirect("/home"); // Redirect to user-page if the user exists
  }
  