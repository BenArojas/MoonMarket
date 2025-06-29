// components/charts/NavChartLW.tsx
import { AreaChart } from '@/components/LwAreaChart';
import { toSeries } from '@/utils/lwHelpers';

interface Props {
  dates: string[];
  values: number[];
}

export default function NavChartLW({ dates, values }: Props) {
  return (
    <AreaChart
      data={toSeries(dates, values)}
      height={240}
      enableAdvancedFeatures   // 👈 activates BrushableAreaSeries + delta tooltip
      trend={
        values[values.length - 1] >= values[0] ? 'positive' : 'negative'
      }                           // just colours the brush/fade correctly
    />
  );
}
