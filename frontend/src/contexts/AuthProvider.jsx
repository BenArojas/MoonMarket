  import React, { createContext, useContext, useMemo, useReducer, useEffect } from "react";
  import api, {authCheckApi } from "@/api/axios";

  const AuthContext = createContext();

  const ACTIONS = {
    setAuth: "setAuth",
    clearAuth: "clearAuth",
  };

  const authReducer = (state, action) => {
    switch (action.type) {
      case ACTIONS.setAuth:
        return { ...state, isAuthenticated: true };
      case ACTIONS.clearAuth:
        return { ...state, isAuthenticated: false };
      default:
        return state;
    }
  };

  const initialState = {
    isAuthenticated: false,
  };

  export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
      checkAuthStatus();
    }, []);

    const refreshToken = async () => {
      try {
        await api.post('/auth/refresh');
        dispatch({ type: ACTIONS.setAuth });
      } catch (error) {
        dispatch({ type: ACTIONS.clearAuth });
        // Redirect to login or handle as needed
      }
    };

    const checkAuthStatus = async () => {
      try {
        await authCheckApi.get('/auth/protected-route');
        dispatch({ type: ACTIONS.setAuth });
      } catch (error) {
          dispatch({ type: ACTIONS.clearAuth });
      }
    };

    const login = async (email, password) => {
      try {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);
    
        const response = await api.post('/auth/login', 
          formData,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        dispatch({ type: ACTIONS.setAuth });
        return response.data;
      } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        throw error;
      }
    };

    const logout = async () => {
      try {
        await api.post('/auth/logout'); // Send logout request to server
      } catch (error) {
        console.error("Logout failed", error);
        // You can handle the error if needed, e.g., show a notification
      } finally {
        // Clear auth state even if the API call fails
        dispatch({ type: ACTIONS.clearAuth });
      }
    };
    

    const value = useMemo(
      () => ({ ...state, login, logout, checkAuthStatus }),
      [state]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

  export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
  };