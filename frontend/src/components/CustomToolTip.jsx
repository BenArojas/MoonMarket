import { Tooltip, Typography, Divider, Box } from "@mui/material";
import '@/styles/tooltip.css'

function CustomTooltip({
  children,
  ticker,
  name,
  quantity,
  percentageOfPortfolio,
  value,
  last_price,
  avgSharePrice,
}) {
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
              <Typography variant="subtitle2">{last_price}$</Typography>
            </li>
            <li className="tooltip-data-row">
              <Typography variant="body2">
                Avarge bought price
              </Typography>
              <Typography variant="subtitle2">{avgSharePrice}$</Typography>
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
              <Typography variant="subtitle2">{percentageOfPortfolio}%</Typography>
            </li>
          </ul>
          {/* Add any other properties you want to display */}
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