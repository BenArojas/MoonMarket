import api, {authCheckApi} from "@/api/axios";


export const fetchAuthStatus = async () => {
    try {
      const response = await authCheckApi.get("/auth/protected-route");
      return response.data.isAuthenticated;
    } catch (error) {
      throw new Error("Unauthorized");
    }
  };