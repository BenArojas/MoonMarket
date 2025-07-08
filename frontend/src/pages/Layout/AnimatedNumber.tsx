import CountUp from "react-countup";
import {  Typography,  useMediaQuery, useTheme,  responsiveFontSizes } from '@mui/material'

interface PortfolioValue{
  value: number
}
const PortfolioValue = ({ value }: PortfolioValue) => {
  let theme = useTheme();
  theme = responsiveFontSizes(theme);
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Typography variant={isMobileScreen?"subtitle1":"h5"} color="secondary">
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
