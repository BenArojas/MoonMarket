import React, { useEffect, useRef } from 'react';
import Sankey from '@/components/SankeyChart'




const data = {
  nodes: [
    { id: "Stocks" },
    { id: "Positive" },
    { id: "Negative" },
    { id: "IREN" },
    { id: "WULF" },
    { id: "CORZ" },
    { id: "IBIT" },
    { id: "RIOT" },
    { id: "MARA" },
    { id: "BTBT" },
    { id: "CLSK" },
    { id: "COIN" },
    { id: "CIFR" },
    { id: "HIVE" },
    { id: "BITF" }
  ],
  links: [
    { source: "Stocks", target: "Positive", value: 2380.76 },
    { source: "Stocks", target: "Negative", value: 6754.46 },
    { source: "Positive", target: "IREN", value: 848.63 },
    { source: "Positive", target: "WULF", value: 1030.5 },
    { source: "Positive", target: "CORZ", value: 251.58 },
    { source: "Positive", target: "IBIT", value: 250.6 },
    { source: "Negative", target: "RIOT", value: 388.26 },
    { source: "Negative", target: "MARA", value: 1134.42 },
    { source: "Negative", target: "BTBT", value: 1420.16 },
    { source: "Negative", target: "CLSK", value: 1672.14 },
    { source: "Negative", target: "COIN", value: 680.36 },
    { source: "Negative", target: "CIFR", value: 725 },
    { source: "Negative", target: "HIVE", value: 286.12 },
    { source: "Negative", target: "BITF", value: 448 }
  ]
};


function Test() {
  return (
    <div>
      <h1>Stock Portfolio Sankey Diagram</h1>
      <Sankey width={1000} height={600}/>
    </div>
  );
}
export default Test;
