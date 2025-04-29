import * as React from "react";
import { Box, Card, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown } from "@fortawesome/free-solid-svg-icons";
import Avatar from "@mui/material/Avatar";
import ShowChartSharpIcon from "@mui/icons-material/ShowChartSharp";
import FolderIcon from "@mui/icons-material/Folder";
import AlertDialogSlide from "@/components/stockDialog/StockDialog";
import { useTheme } from "@mui/material";

export interface Stock {
  ticker: string;
  earnings: string;
  percentageOfPortfolio: string;
  gainLoss: string;
  name: string;
  priceChange: number;
  value: string;
  sharePrice: number;
  quantity: number;
//   [key: string]: any;
}

interface LeaderboardCardProps {
  Number: number;
  stock: Stock;
  changeCount: string | number;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ Number, stock, changeCount }) => {
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
  const theme = useTheme();

  const handleClickDialogOpen = () => {
    setDialogOpen(true);
  };

  return (
    <>
      <Card
        sx={{
          height: 400,
          width: 280,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "transparent", 
          boxShadow: "none",
        }}
      >
        <Box
          id="Content"
          sx={{
            backgroundColor: "transparent",
            flex: 1,
            gap: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            margin: "auto",
            position: "relative",
            width: "100%",
            background:
            Number === 1
              ? "linear-gradient(to top, rgba(255, 212, 59, 0.3) 0%, rgba(255, 212, 59, 0.1) 100%)"
              : Number === 2
                ? "linear-gradient(to top, rgba(116, 192, 252, 0.3) 0%, rgba(116, 192, 252, 0.1) 100%)"
                : Number === 3
                  ? "linear-gradient(to top, rgba(192, 192, 192, 0.3) 0%, rgba(192, 192, 192, 0.1) 100%)"
                  : "none",
          }}
        >
          <FontAwesomeIcon
            icon={faCrown}
            style={{
              color:
                Number === 1 ? "#FFD43B" : Number === 2 ? "#74C0FC" : "#9ca7b0",
              height: 40,
            }}
          />
          <Avatar sx={{}}>
            <ShowChartSharpIcon />
          </Avatar>
          <Typography>{stock.ticker}</Typography>
          <Typography>{changeCount}</Typography>
          <FolderIcon
            onClick={handleClickDialogOpen}
            sx={{ cursor: "pointer" }}
          />
        </Box>
        <Box
          className="Number"
          sx={{
            textAlign: "center",
            backgroundColor: "background.paper",
            height: Number === 1 ? "35%" : "25%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow:
              "0 -4px 8px -1px rgba(0, 0, 0, 0.5), 0 -1px 0 rgba(255, 255, 255, 0.1) inset",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Typography
            sx={{
              color: theme.palette.text.primary, 
            }}
          >
            #{Number}
          </Typography>
        </Box>
      </Card>
      <AlertDialogSlide
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        stock={stock}
      />
    </>
  );
};

export default LeaderboardCard; 