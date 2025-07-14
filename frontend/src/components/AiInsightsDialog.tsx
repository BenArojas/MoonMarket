import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, Tabs, Tab, Box, CircularProgress, Typography, Alert
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { fetchPortfolioAnalysis, fetchMarketReport } from "@/api/user";
// Assume you have a way to get portfolio data, e.g., from your Zustand store
// import { useStockStore } from "@/stores/stockStore"; 

interface AiInsightsDialogProps {
  open: boolean;
  onClose: () => void;
  portfolioData: any[]; // Pass portfolio data as a prop
}

const AiInsightsDialog = ({ open, onClose, portfolioData }: AiInsightsDialogProps) => {
  const [activeTab, setActiveTab] = useState(0);

  const {
    data: analysisData,
    isLoading: isAnalysisLoading,
    error: analysisError,
  } = useQuery({
    queryKey: ["portfolioAnalysis", portfolioData],
    queryFn: () => fetchPortfolioAnalysis(portfolioData),
    enabled: open && activeTab === 0, // Only fetch when dialog is open and tab is active
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const {
    data: reportData,
    isLoading: isReportLoading,
    error: reportError,
  } = useQuery({
    queryKey: ["marketReport"],
    queryFn: fetchMarketReport,
    enabled: open && activeTab === 1, // Only fetch when tab is active
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  const renderContent = (isLoading: boolean, error: any, content: string | undefined) => {
    if (isLoading) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }
    if (error) {
      return <Alert severity="error">Failed to load data: {error.message}</Alert>;
    }
    // Style the markdown content for readability
    return <Box sx={{ typography: 'body1', 'h3': { fontSize: '1.5rem' }, 'h4': { fontSize: '1.2rem' } }}>
      <ReactMarkdown>{content || "No content available."}</ReactMarkdown>
    </Box>;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>AI-Powered Insights</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Portfolio Analysis" />
            <Tab label="Market Report" />
          </Tabs>
        </Box>

        {activeTab === 0 && renderContent(isAnalysisLoading, analysisError, analysisData?.analysis)}
        {activeTab === 1 && renderContent(isReportLoading, reportError, reportData?.report)}
      </DialogContent>
    </Dialog>
  );
};

export default AiInsightsDialog;