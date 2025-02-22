import { useState } from "react";
import "@/styles/App.css";
import { Box, Dialog, DialogContent, DialogTitle, Tab, Tabs, Typography } from "@mui/material";
import { CircularProgress } from "@mui/material";

export default function AiDialog({ openInsights, setOpenInsights, aiData }) {
  const [tabValue, setTabValue] = useState(0);
  const handleTabChange = (event, newValue) => setTabValue(newValue);

  if (!aiData || (!aiData.portfolio_insights.length && !Object.keys(aiData.sentiments).length)) {
    return (
      <Dialog open={openInsights} onClose={() => setOpenInsights(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={openInsights} onClose={() => setOpenInsights(false)} maxWidth="sm" fullWidth>
      <DialogTitle>AI Portfolio Analysis</DialogTitle>
      <DialogContent>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="AI analysis tabs">
          <Tab label="Portfolio Insights" />
          <Tab label="Social Sentiment" />
        </Tabs>
        {tabValue === 0 && (
          <Box sx={{ mt: 2 }}>
            {aiData.portfolio_insights.length > 0 ? (
              aiData.portfolio_insights.map((insight, index) => (
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
            {Object.entries(aiData.sentiments).map(([ticker, sentiment]) => (
              <Box key={ticker} sx={{ mb: 1 }}>
                <Typography variant="h6">{ticker}</Typography>
                <Typography>{sentiment.sentiment}</Typography>
                {sentiment.sample_posts.slice(0, 2).map((post, i) => (
                  <Typography key={i} variant="caption">
                    {post}
                  </Typography>
                ))}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}