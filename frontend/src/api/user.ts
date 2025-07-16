import api from "@/api/axios";
import { AccountDetailsDTO, LedgerDTO } from "@/stores/stockStore";
import "react-toastify/dist/ReactToastify.css";


export interface NAVSeries {
  dates: string[];
  navs: number[];
}
export interface ReturnSeries {
  dates: string[];
  returns: number[];
}

export interface Performance {
  nav: NAVSeries;
  cps: ReturnSeries;
  tpps: ReturnSeries;
}

export const fetchPerformance = async (
  accountId: string | null,
  period: string
) => {
  // Don't fetch if the ID is null (the 'enabled' option should prevent this anyway)
  if (!accountId) {
    return null;
  }

  // Add the accountId to the request as a query parameter
  const { data } = await api.get(`/account/performance`, {
    params: {
      accountId: accountId,
      period: period,
    },
  });
  return data;
};


/**
 * Fetches consolidated account details from the backend.
 */
export async function fetchAccountDetails(
  accountId: string | null
): Promise<AccountDetailsDTO | null> {
  if (!accountId) {
    return null;
  }
  const { data } = await api.get<AccountDetailsDTO>(
    `/account/account-details`,
    {
      params: {
        accountId: accountId,
      },
    }
  );
  return data;
}

/**
 * Fetches the detailed, multi-currency balance ledger.
 */
export async function fetchBalances(
  accountId: string | null
): Promise<LedgerDTO | null> {
  if (!accountId) {
    return null;
  }
  // Assuming your endpoint is /ledger and takes an 'acct' query param
  const { data } = await api.get<LedgerDTO>("/account/ledger", {
    params: {
      accountId: accountId,
    },
  });
  return data;
}

/**
 * Checks if the AI features are available on the server.
 * We'll use the market-report endpoint as a lightweight check.
 */
export const checkAiFeatures = async (): Promise<{ enabled: boolean }> => {
  try {
    // --- UPDATE THIS LINE ---
    // Point to the new, lightweight status endpoint instead of the market report.
    await api.get("/ai/status");
    
    // If the request succeeds (doesn't throw), features are enabled
    return { enabled: true };
  } catch (error: any) {
    // A 412 status means the API keys are not set, which is an expected state.
    if (error.response && error.response.status === 412) {
      console.log("AI features disabled on server (API keys missing).");
      return { enabled: false };
    }
    // For other errors, we can re-throw or handle them as needed
    throw error;
  }
};


/**
 * Fetches the AI-powered analysis for a given portfolio.
 * @param portfolioData - Array of objects like [{ ticker: "AAPL", value: 5000 }, ...]
 */
export const fetchPortfolioAnalysis = async (portfolioData: any[]) => {
  const { data } = await api.post("/ai/portfolio/analysis", portfolioData);
  return data; // { analysis: "..." }
};

/**
 * Fetches the general AI-powered market report.
 */
export const fetchMarketReport = async () => {
  const { data } = await api.get("/ai/market-report");
  return data; // { report: "..." }
};

export interface TweetInfo {
  url: string;
  text: string;
  score: number;
  likes: number;
  retweets: number;
}

// This matches the SentimentResponse Pydantic model
export interface SentimentResponse {
  sentiment: "positive" | "negative" | "neutral"; // Be specific about the possible string values
  score: number;
  score_label: string;
  tweets_analyzed: number;
  top_positive_tweet: TweetInfo | null;
  top_negative_tweet: TweetInfo | null;
}

/**
 * Fetches the Twitter sentiment for a specific stock ticker.
 */
export const fetchStockSentiment = async (ticker: string): Promise<SentimentResponse> => {
  const { data } = await api.get(`/ai/stock/${ticker}/sentiment`);
  return data; 
};