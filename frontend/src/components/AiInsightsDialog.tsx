import { fetchMarketReport, fetchPortfolioAnalysis } from "@/api/user";
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface AiInsightsDialogProps {
  open: boolean;
  onClose: () => void;
  portfolioData: any[]; 
}

const AiInsightsDialog = ({
  open,
  onClose,
  portfolioData,
}: AiInsightsDialogProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const {
    data: analysisData,
    isLoading: isAnalysisLoading,
    error: analysisError,
    refetch: refetchAnalysis, 
  } = useQuery({
    queryKey: ["portfolioAnalysis"],
    queryFn: () => fetchPortfolioAnalysis(portfolioData), 
    enabled: open && activeTab === 0, // Only fetch when dialog is open and tab is active
    staleTime: CACHE_DURATION, 
    gcTime: CACHE_DURATION + (5 * 60 * 1000), 
    refetchOnWindowFocus: false, // Prevents refetching on window focus
  });

  const {
    data: reportData,
    isLoading: isReportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ["marketReport"], 
    queryFn: fetchMarketReport,
    enabled: open && activeTab === 1,
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION + (5 * 60 * 1000),
    refetchOnWindowFocus: false,
  });

  const componentsConfig = {
    a: ({ node, ...props }: any) => (
      <a {...props} target="_blank" rel="noopener noreferrer" />
    ),
  };

  const renderContent = (
    isLoading: boolean,
    error: any,
    content: string | undefined
  ) => {
    if (isLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (error) {
      return (
        <Alert severity="error">Failed to load data: {error.message}</Alert>
      );
    }
    // Style the markdown content for readability
    return (
      <Box
        sx={{
          typography: "body1",
          h3: { fontSize: "1.5rem" },
          h4: { fontSize: "1.2rem" },
        }}
      >
        <ReactMarkdown components={componentsConfig}>{content || "No content available."}</ReactMarkdown>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        AI-Powered Insights
        {/* --- 3. Update onClick for the refresh button --- */}
        <Tooltip title="Re-run with latest data">
          <span>
            <IconButton
              onClick={() => (activeTab === 0 ? refetchAnalysis() : refetchReport())}
              disabled={isAnalysisLoading || isReportLoading}
              size="small"
            >
              <RefreshCw size={20} />
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>
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
