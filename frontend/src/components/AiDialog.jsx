import { useState } from "react";
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
import {getStockSentiment} from '@/api/user'

export default function AiDialog({ openInsights, setOpenInsights, aiData, loadingAI }) {
  const [tabValue, setTabValue] = useState(0);
  const [ticker, setTicker] = useState("");
  const [sentiments, setSentiments] = useState(aiData?.sentiments || {});
  const [loadingSentiment, setLoadingSentiment] = useState(false);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const handleTickerSubmit = async (e) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoadingSentiment(true);
    try {
      const response = await getStockSentiment(ticker.toUpperCase());
      const sentimentData = response.data;
      setSentiments((prev) => ({
        ...prev,
        [ticker.toUpperCase()]: sentimentData,
      }));
    } catch (error) {
      setSentiments((prev) => ({
        ...prev,
        [ticker.toUpperCase()]: { sentiment: "Error", sample_posts: ["Unable to fetch sentiment"] },
      }));
    } finally {
      setLoadingSentiment(false);
      setTicker(""); 
    }
  };

  const safeAiData = aiData || { portfolio_insights: [], sentiments: {} };

  return (
    <Dialog open={openInsights} onClose={() => setOpenInsights(false)} maxWidth="sm" fullWidth>
      <DialogTitle>AI Portfolio Analysis</DialogTitle>
      <DialogContent className="custom-scrollbar">
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="AI analysis tabs">
          <Tab label="Portfolio Insights" />
          <Tab label="Social Sentiment" />
        </Tabs>
        {tabValue === 0 && (
          <Box sx={{ mt: 2 }}>
            {safeAiData.portfolio_insights.length > 0 ? (
              safeAiData.portfolio_insights.map((insight, index) => (
                <Typography key={index} paragraph>
                  {insight}
                </Typography>
              ))
            ) : (
              <Typography>No insights available.</Typography>
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
                  {loadingSentiment ? <CircularProgress size={24} /> : "Get Sentiment"}
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
                    {sentiment.sentiment} ({sentiment.bullish_pct}% Bullish, {sentiment.bearish_pct}% Bearish)
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: sentiment.activity === "Low activity" ? "orange" : "gray" }}
                  >
                    Based on {sentiment.post_count} posts ({sentiment.activity}) from the {sentiment.time_range}
                  </Typography>
                  {sentiment.sample_posts.map((post, i) => (
                    <Typography key={i} variant="caption" sx={{ display: "block", color: "gray" }}>
                      "{post}"
                    </Typography>
                  ))}
                  {sentiment.top_post && (
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                      Top Post ({sentiment.top_post.likes} likes): "{sentiment.top_post.text}"
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