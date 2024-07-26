import { useState } from "react";
import { DonutBarplotChart } from "@/components/space/DonutBarPlotChart";
import { Box } from "@mui/material";


const BUTTONS_HEIGHT = 50;


const buttonStyle = {
  border: "1px solid #fff",
  borderRadius: "3px",
  padding: "0px 8px",
  margin: "10px 2px",
  fontSize: 14,
  float: "right",
};

export const DonutBarplotTransition = ({Holdingsdata}) => {
  const [type, setType] = useState("pie");

  return (
    <Box sx={{
      display:'flex',
      flexDirection: 'column',

    }}>
      <div style={{ height: BUTTONS_HEIGHT, }}>
        <button style={buttonStyle} onClick={() => setType("pie")}>
          Pie chart
        </button>
        <button style={buttonStyle} onClick={() => setType("bar")}>
          Barplot
        </button>
      </div>
      <Box sx={{
        margin:'auto'
      }}>
      <DonutBarplotChart
        width={800}
        height={400 - BUTTONS_HEIGHT}
        data={Holdingsdata}
        type={type}
      />
      </Box>
    </Box>
  );
};
