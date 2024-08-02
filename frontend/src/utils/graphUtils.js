export function getGraphData(processedData, selectedGraph) {
    return processedData[selectedGraph] || processedData.Treemap;
  }