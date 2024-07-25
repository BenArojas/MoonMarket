import React from "react";
import CountUp from "react-countup";
import Typography from "@mui/material/Typography";

const PortfolioValue = ({ value }) => {
  return (
    <Typography variant="h3" color="secondary">
      <CountUp
        end={value}
        separator=","
        decimal="."
        prefix="$"
        duration={2.5}
        decimals={0}
      />
    </Typography>
  );
};

export default PortfolioValue;
