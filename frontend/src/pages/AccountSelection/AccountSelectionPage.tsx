import api from "@/api/axios";
import { BriefAccountInfo, useStockStore } from "@/stores/stockStore";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useTransition } from "react";

// This function would live in an API service file, e.g., src/api/user.ts
const fetchAvailableAccounts = async (): Promise<BriefAccountInfo[]> => {
  const { data } = await api.get("/account/accounts");
  return data;
};

const AccountSelectionPage = () => {
  const [isPending, startTransition] = useTransition();
  const setAllAccounts = useStockStore((state) => state.setAllAccounts);
  const setSelectedAccountId = useStockStore((state) => state.setSelectedAccountId);

  // Note: Renamed to standard camelCase for consistency
  const selectedAccountId = useStockStore((state) => state.selectedAccountId);

  if(selectedAccountId!= null){
    
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["availableAccounts"],
    queryFn: fetchAvailableAccounts,
  });

  // This logic is now safe because the component won't re-render unnecessarily.
  useEffect(() => {
    if (data?.length === 1) {
      startTransition(() => {
        setAllAccounts(data);
        setSelectedAccountId(data[0].accountId);
      });
    }
  }, [data, setAllAccounts, setSelectedAccountId]);

  const handleManualAccountSelect = (account: BriefAccountInfo) => {
    startTransition(() => {
      if (data) setAllAccounts(data);
      setSelectedAccountId(account.accountId);
    });
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
        <Typography variant="h6" ml={2}>
          Fetching accounts...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error">
          Failed to fetch accounts. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  // Handle case where user has no accounts
  if (!data || data.length === 0) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          No Accounts Found
        </Typography>
        <Alert severity="warning">
          We could not find any trading accounts associated with your user.
        </Alert>
      </Container>
    );
  }

  // Handle case where user has only one account
  if (data?.length === 1) {
    return (
       <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
        <Typography variant="h6" ml={2}>One account found, redirecting...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8, textAlign: "center" }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Select an Account
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 6 }}>
        Choose the account you would like to manage for this session.
      </Typography>
      <Grid container spacing={4} justifyContent="center">
        {data.map((account) => (
          <Grid item key={account.accountId} xs={12} sm={6} md={4}>
            <Card sx={{ height: "100%", display: "flex" }}>
              <CardActionArea onClick={() => handleManualAccountSelect(account)}>
                <CardContent>
                  <Typography variant="h5" component="div" gutterBottom>
                    {account.displayName || account.accountTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {account.accountId}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default AccountSelectionPage;
