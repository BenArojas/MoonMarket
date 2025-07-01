import {
    AccountDetailsDTO,
    useStockStore
} from "@/stores/stockStore";
import {
    Alert,
    Box,
    Card,
    CardContent,
    CircularProgress,
    Grid,
    Typography
} from "@mui/material";
import { useEffect } from "react";


export const AccountDetailsTabContent = ({
    data,
    isLoading,
    error,
  }: {
    data: AccountDetailsDTO | undefined;
    isLoading: boolean;
    error: Error | null;
  }) => {
    if (isLoading)
      return (
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      );
    if (error)
      return (
        <Alert severity="error">
          Failed to load account details: {error.message}
        </Alert>
      );
    if (!data) return <Typography>No account details available.</Typography>;

    const { setAccountDetails} = useStockStore();

    useEffect(() => {
        if (data) {
          setAccountDetails(data);
        }
      }, [data]); 
  
    const DetailItem = ({ label, value }) => (
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: "500" }}>
          {String(value)}
        </Typography>
      </Grid>
    );
  
    return (
      <Box sx={{ 
        maxHeight: '50vh',
        overflow: 'auto',
        pr: 1, // Add some padding for the scrollbar
      }}>
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Owner Information
            </Typography>
            <Grid container spacing={2}>
              <DetailItem label="Username" value={data.owner.userName} />
              <DetailItem label="Full Name" value={data.owner.entityName} />
              <DetailItem label="Role" value={data.owner.roleId} />
            </Grid>
          </CardContent>
        </Card>
  
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            <Grid container spacing={2}>
              <DetailItem label="Account ID" value={data.account.accountId} />
              <DetailItem
                label="Account Title"
                value={data.account.accountTitle}
              />
              <DetailItem label="Account Type" value={data.account.accountType} />
              <DetailItem label="Trading Type" value={data.account.tradingType} />
              <DetailItem
                label="Base Currency"
                value={data.account.baseCurrency}
              />
              <DetailItem label="IB Entity" value={data.account.ibEntity} />
              <DetailItem
                label="Status"
                value={data.account.clearingStatus === "O" ? "Open" : "Other"}
              />
              <DetailItem
                label="Account Mode"
                value={data.account.isPaper ? "Paper Trading" : "Live"}
              />
            </Grid>
          </CardContent>
        </Card>
  
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Permissions
            </Typography>
            <Grid container spacing={2}>
              <DetailItem
                label="FX Conversion"
                value={data.permissions.allowFXConv ? "Allowed" : "Not Allowed"}
              />
              <DetailItem
                label="Crypto Trading"
                value={data.permissions.allowCrypto ? "Allowed" : "Not Allowed"}
              />
              <DetailItem
                label="Event Trading"
                value={
                  data.permissions.allowEventTrading ? "Allowed" : "Not Allowed"
                }
              />
              <DetailItem
                label="Fractional Shares"
                value={
                  data.permissions.supportsFractions ? "Allowed" : "Not Allowed"
                }
              />
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  };