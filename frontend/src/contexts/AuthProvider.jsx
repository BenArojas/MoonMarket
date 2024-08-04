import axios from "axios";
import { createContext, useContext, useMemo, useReducer } from "react";

const AuthContext = createContext();

const ACTIONS = {
  setTokens: "setTokens",
  clearTokens: "clearTokens",
};

const authReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.setTokens:
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("refreshToken", action.payload.refreshToken);
      localStorage.setItem("tokenExpiry", action.payload.tokenExpiry);

      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        tokenExpiry: action.payload.tokenExpiry,
      };

    case ACTIONS.clearTokens:
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("tokenExpiry");

      return { ...state, token: null, refreshToken: null, tokenExpiry: null };

    default:
      console.error(
        `You passed an action.type: ${action.type} which doesn't exist`
      );
      return state;
  }
};

const initialData = {
  token: localStorage.getItem("token"),
  refreshToken: localStorage.getItem("refreshToken"),
  tokenExpiry: localStorage.getItem("tokenExpiry"),
};

const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialData);

  const setTokens = (token, refreshToken, tokenExpiry) => {
    dispatch({
      type: ACTIONS.setTokens,
      payload: { token, refreshToken, tokenExpiry },
    });
  };

  const clearTokens = () => {
    dispatch({ type: ACTIONS.clearTokens });
  };

  const contextValue = useMemo(
    () => ({
      ...state,
      setTokens,
      clearTokens,
    }),
    [state]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthProvider;