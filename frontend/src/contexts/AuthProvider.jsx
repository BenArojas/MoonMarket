  import React, { createContext, useContext, useMemo, useReducer, useEffect } from "react";
  import api, {authCheckApi } from "@/api/axios";

  const AuthContext = createContext();


  export const AuthProvider = ({ children }) => {

    const refreshToken = async () => {
      try {
        await api.post('/auth/refresh');
      } catch (error) {
        // Redirect to login or handle as needed
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
       
      }
    };
    

    const value = useMemo(
      () => ({  login, logout }),
      []
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