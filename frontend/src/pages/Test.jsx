import React from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useTheme } from "@/contexts/ThemeContext";
import TickerTape from "@/components/tradingView/TickerTapeTradingView";
import SwitchableHeatMap from "@/components/SwitchHeatMap";
import { Box } from "@mui/material";
import Timeline from "@/components/tradingView/TimelineTradingView";
import HotList from "@/components/tradingView/HotListTradingVIew";
import TechnicalAnalysis from "@/components/tradingView/TechnicalAnalysisTradingView";

function Test() {
  const { mode } = useTheme();
  return (
    <div>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel>
          <Timeline mode={mode} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel><SwitchableHeatMap mode={mode}/></ResizablePanel>
      </ResizablePanelGroup>
      <ResizablePanelGroup direction="vertical">
      <ResizablePanel> <TechnicalAnalysis mode={mode}/></ResizablePanel>
      <ResizablePanel> <HotList mode={mode}/></ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default Test;
