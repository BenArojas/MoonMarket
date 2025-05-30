import { Tooltip, Typography, Divider, Box } from "@mui/material";
import { ReactElement } from "react";
import '@/styles/tooltip.css'

interface CustomTooltipProps {
  children: ReactElement;
  name: string;
  quantity: number;
  percentageOfPortfolio: number;
  value: number;
  last_price: number;
  avgSharePrice: number;
}


function CustomTooltip({
  children,
  name,
  quantity,
  percentageOfPortfolio,
  value,
  last_price,
  avgSharePrice,
}: CustomTooltipProps) {
  return (
    <Tooltip
      followCursor
      title={
        <Box
          sx={{
            width: "250px",
            display: "flex",
            flexDirection: "column",
            padding: 2,
          }}
        >
          <Typography variant="body1">{name}</Typography>
          <Divider />
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            <li className="tooltip-data-row">
              <Typography variant="body2">last price </Typography>
              <Typography variant="subtitle2">{last_price.toFixed(2)}$</Typography>
            </li>
            <li className="tooltip-data-row">
              <Typography variant="body2">
                Average bought price
              </Typography>
              <Typography variant="subtitle2">{avgSharePrice.toFixed(2)}$</Typography>
            </li>
            <li className="tooltip-data-row">
              <Typography variant="body2">
                Value: ({quantity} shares)
              </Typography>
              <Typography variant="subtitle2">{value?.toLocaleString("en-US")}$</Typography>
            </li>
            <li className="tooltip-data-row">
              <Typography variant="body2">
                In your portfolio
              </Typography>
              <Typography variant="subtitle2">{percentageOfPortfolio.toFixed(2)}%</Typography>
            </li>
          </ul>
        </Box>
      }
      slotProps={{
        popper: {
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [0, 14],
              },
            },
          ],
        },
      }}
    >
      {children}
    </Tooltip>
  );
}

export default CustomTooltip;