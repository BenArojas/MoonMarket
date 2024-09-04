import React, { useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

const TradingViewWidget = ({ symbol }) => (
  <iframe
    src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_76d87&symbol=${symbol}&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Light&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=www.tradingview.com&utm_medium=widget_new&utm_campaign=chart&utm_term=NASDAQ%3AAAPL`}
    style={{ width: "100%", height: "100%", border: "none" }}
    allowTransparency={true}
    scrolling="no"
  ></iframe>
);
function Test() {
  const [layouts, setLayouts] = useState({
    lg: [
      { i: "chart1", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 1 },
      { i: "chart2", x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 1 },
      { i: "chart3", x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 1 },
    ]
  });

  const onLayoutChange = (layout, layouts) => {
    setLayouts(layouts);
  };

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={onLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={150}
        isResizable={true}
        isDraggable={true}
      >
        {layouts.lg.map((item) => (
          <div key={item.i} className="grid-item">
            <div className="drag-handle">{item.i}</div>
            <div className="widget-container">
              <TradingViewWidget symbol={`NASDAQ:${item.i.replace('chart', '')}`} />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
export default Test