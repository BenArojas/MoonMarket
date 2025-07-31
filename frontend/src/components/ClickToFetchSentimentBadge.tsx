import { fetchStockSentiment } from "@/api/user";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Link,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquareText,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

interface StockSentimentBadgeProps {
  ticker: string;
}

const ClickToFetchSentimentBadge = ({ ticker }: StockSentimentBadgeProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["stockSentiment", ticker],
    queryFn: () => fetchStockSentiment(ticker),
    enabled: false, 
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const handleFetchClick = () => {
    refetch(); // Manually trigger the fetch.
  };

  if (data && data.tweets_analyzed > 10) {
    const sentimentConfig = {
      positive: {
        label: "Positive",
        color: "success" as "success",
        icon: <TrendingUp size={14} />,
      },
      negative: {
        label: "Negative",
        color: "error" as "error",
        icon: <TrendingDown size={14} />,
      },
      neutral: {
        label: "Neutral",
        color: "default" as "default",
        icon: <Minus size={14} />,
      },
    };

    const config = sentimentConfig[data.sentiment];

    return (
      <>
        <Tooltip title="Click to see sentiment details">
          <Chip
            icon={config.icon}
            label={config.label}
            color={config.color}
            size="small"
            onClick={() => setIsDialogOpen(true)}
            sx={{ ml: 1, cursor: "pointer" }}
          />
        </Tooltip>
        <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
          <DialogTitle>Sentiment Details for {ticker}</DialogTitle>
          <DialogContent dividers>
            <Typography gutterBottom>
              Overall Sentiment: <strong>{config.label}</strong> (Score:{" "}
              {data.score})
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {data.score_label}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={data.score * 50 + 50} 
                sx={{ width: "100%", height: 8, borderRadius: 5 }}
                color={
                  data.sentiment === "positive"
                    ? "success"
                    : data.sentiment === "negative"
                    ? "error"
                    : "inherit"
                }
              />
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                {data.score}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Based on {data.tweets_analyzed} tweets from the last 7 days.
            </Typography>

            {data.top_positive_tweet && (
              <Box mt={2}>
                <Typography variant="subtitle1" color="success.main">
                  Top Positive Tweet
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: "italic", my: 1 }}>
                  "{data.top_positive_tweet.text}"
                </Typography>
                <Link href={data.top_positive_tweet.url} target="_blank">
                  View on X
                </Link>
              </Box>
            )}

            {data.top_negative_tweet && (
              <Box mt={2}>
                <Typography variant="subtitle1" color="error.main">
                  Top Negative Tweet
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: "italic", my: 1 }}>
                  "{data.top_negative_tweet.text}"
                </Typography>
                <Link href={data.top_negative_tweet.url} target="_blank">
                  View on X
                </Link>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (isLoading) {
    return <CircularProgress size={20} sx={{ ml: 1 }} />;
  }

  return (
    <Tooltip title="Check sentiment on X">
      <IconButton onClick={handleFetchClick} size="small" sx={{ ml: 0.5 }}>
        <MessageSquareText size={16} />
      </IconButton>
    </Tooltip>
  );
};

export default ClickToFetchSentimentBadge;
