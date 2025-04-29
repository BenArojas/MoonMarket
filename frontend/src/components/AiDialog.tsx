import { useState, FormEvent } from "react";
import "@/styles/App.css";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import { getStockSentiment } from "@/api/user";

// Type for the sentiment data returned by getStockSentiment
interface SentimentData {
  sentiment: "bullish" | "bearish" | "neutral" | "Error";
  bullish_pct: number;
  bearish_pct: number;
  neutral_pct: number;
  post_count: number;
  activity: string;
  time_range: string;
  sample_posts: string[];
  top_post?: {
    text: string;
    likes: number;
  };
}

// Type for the AI data from the backend
interface AiData {
  portfolio_insights: string;
  citations: string[];
  sentiments: Record<string, SentimentData>;
}

// Props for the AiDialog component
interface AiDialogProps {
  openInsights: boolean;
  setOpenInsights: (bool: boolean) => void;
  aiData: AiData;
}

export default function AiDialog({
  openInsights,
  setOpenInsights,
  aiData,
}: AiDialogProps) {
  const [tabValue, setTabValue] = useState(0);
  const [ticker, setTicker] = useState("");
  const [sentiments, setSentiments] = useState<Record<string, SentimentData>>(
    aiData.sentiments || {}
  );
  const [loadingSentiment, setLoadingSentiment] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) =>
    setTabValue(newValue);

  const handleTickerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoadingSentiment(true);
    try {
      const response = await getStockSentiment(ticker.toUpperCase());
      const sentimentData: SentimentData = response.data;
      setSentiments((prev) => ({
        ...prev,
        [ticker.toUpperCase()]: sentimentData,
      }));
    } catch (error) {
      setSentiments((prev) => ({
        ...prev,
        [ticker.toUpperCase()]: {
          sentiment: "Error",
          sample_posts: ["Unable to fetch sentiment"],
          bullish_pct: 0,
          bearish_pct: 0,
          neutral_pct: 0,
          post_count: 0,
          activity: "Unknown",
          time_range: "Unknown",
        },
      }));
    } finally {
      setLoadingSentiment(false);
      setTicker("");
    }
  };

  // Fallback for safeAiData
  const safeAiData: AiData = aiData || {
    portfolio_insights: "",
    citations: [],
    sentiments: {},
  };

  return (
    <Dialog
      open={openInsights}
      onClose={() => setOpenInsights(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>AI Portfolio Analysis</DialogTitle>
      <DialogContent className="custom-scrollbar">
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="AI analysis tabs"
        >
          <Tab label="Portfolio Insights" />
          <Tab label="Social Sentiment" />
        </Tabs>
        {tabValue === 0 && (
          <Box sx={{ mt: 2 }}>
            {safeAiData.portfolio_insights ? (
              <Typography paragraph sx={{ whiteSpace: "pre-wrap" }}>
                {safeAiData.portfolio_insights
                  .replace(/<think>[\s\S]*?<\/think>/g, "")
                  .trim()}
              </Typography>
            ) : (
              <Typography>No insights available.</Typography>
            )}
            {safeAiData.citations?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Sources:</Typography>
                <Box
                  component="ul"
                  sx={{
                    listStyleType: "disc",
                    paddingLeft: "10px",
                    margin: 0,
                  }}
                >
                  {safeAiData.citations.map((link, index) => (
                    <li key={index}>
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        {link}
                      </a>
                    </li>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
        {tabValue === 1 && (
          <Box sx={{ mt: 2 }}>
            <form onSubmit={handleTickerSubmit}>
              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <TextField
                  label="Enter Ticker (e.g., MSTR)"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loadingSentiment || !ticker.trim()}
                  sx={{ minWidth: "100px" }}
                >
                  {loadingSentiment ? (
                    <CircularProgress size={24} />
                  ) : (
                    "Get Sentiment"
                  )}
                </Button>
              </Box>
            </form>
            {Object.entries(sentiments).length > 0 ? (
              Object.entries(sentiments).map(([ticker, sentiment]) => (
                <Box key={ticker} sx={{ mb: 2 }}>
                  <Typography variant="h6">{ticker}</Typography>
                  <Typography
                    sx={{
                      color:
                        sentiment.sentiment === "bullish"
                          ? "green"
                          : sentiment.sentiment === "bearish"
                          ? "red"
                          : "gray",
                    }}
                  >
                    {sentiment.sentiment} ({sentiment.bullish_pct}% Bullish,{" "}
                    {sentiment.bearish_pct}% Bearish, {sentiment.neutral_pct}%
                    Neutral)
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color:
                        sentiment.activity === "Low activity" ? "orange" : "gray",
                    }}
                  >
                    Based on {sentiment.post_count} posts ({sentiment.activity})
                    from the {sentiment.time_range}
                  </Typography>
                  {sentiment.sample_posts.map((post, i) => (
                    <Typography
                      key={i}
                      variant="caption"
                      sx={{ display: "block", color: "gray" }}
                    >
                      "{post}"
                    </Typography>
                  ))}
                  {sentiment.top_post && (
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                      Top Post ({sentiment.top_post.likes} likes): "
                      {sentiment.top_post.text}"
                    </Typography>
                  )}
                </Box>
              ))
            ) : (
              <Typography>Enter a ticker to see social sentiment.</Typography>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}