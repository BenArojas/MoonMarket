// components/charts/CumulativeChartLW.tsx
import PerformanceChart from '@/components/LwLineChart';
import { toSeries } from '@/utils/lwHelpers';

interface Props {
  dates: string[];
  values: number[]; // already % returns (e.g. 0.1245)
}

export default function CumulativeChartLW({ dates, values }: Props) {
  return (
    <PerformanceChart
      data={toSeries(dates, values)}
      height={240}
    />
  );
}