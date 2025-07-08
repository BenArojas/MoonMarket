// components/charts/CumulativeChartLW.tsx
import PerformanceChart from '@/components/charts/LineChartLw';
import { toSeries } from '@/utils/lwHelpers';

interface Props {
  dates: string[];
  values: number[]; 
}

export default function CumulativeChartLW({ dates, values }: Props) {
  return (
    <PerformanceChart
      data={toSeries(dates, values)}
      height={240}
    />
  );
}