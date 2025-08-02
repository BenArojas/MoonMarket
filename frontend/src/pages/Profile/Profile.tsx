// src/pages/ProfilePage.tsx
import { ProfileTabs } from "@/pages/Profile/ProfileTabs";
import { useStockStore } from "@/stores/stockStore";
import {
  Box,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";

export const ProfilePage = () => {
  const { allAccounts, selectedAccountId, setSelectedAccountId } =
    useStockStore();
  const handleAccountChange = (event: SelectChangeEvent<string>) => {
    setSelectedAccountId(event.target.value);
    // You might want to trigger a refetch of account-specific data here
    // React Query can handle this automatically if the queryKey depends on selectedAccountId
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 4, // Vertical padding
          px: 2, // Horizontal padding
        }}
      >
        <div className="heading-text">
          <Typography
            variant="h4"
            color="primary"
            sx={{
              textAlign: "center",
              margin: "auto",
              cursor: "pointer",
              width: "200px",
              letterSpacing: "-3px",
              fontWeight: "bold",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: -5,
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: "2px",
                backgroundColor: "currentColor",
                transition: "width 0.3s ease-in-out",
              },
              "&:hover::after": {
                width: "100%",
              },
            }}
          >
            ACCOUNT
          </Typography>
        </div>

        {allAccounts && allAccounts.length > 1 && (
          <FormControl sx={{ mt: 3, minWidth: 240 }} size="small">
            <InputLabel id="account-select-label">Selected Account</InputLabel>
            <Select
              labelId="account-select-label"
              id="account-select"
              value={selectedAccountId || ""}
              label="Selected Account"
              onChange={handleAccountChange}
            >
              {allAccounts.map((account) => (
                <MenuItem key={account.accountId} value={account.accountId}>
                  {account.displayName || account.accountTitle} (
                  {account.accountId})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Divider sx={{ width: "80%", my: 4 }} />

        <ProfileTabs />
      </Box>
    </>
  );
};

export default ProfilePage;
