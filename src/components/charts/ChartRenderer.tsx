import type { ChartSpec, WidgetProps } from '../../lib/types';
import { ChartCard } from './ChartCard';
import { LineChartWidget } from './LineChartWidget';
import { AreaChartWidget } from './AreaChartWidget';
import { BarChartWidget } from './BarChartWidget';
import { PieChartWidget } from './PieChartWidget';
import { ScatterChartWidget } from './ScatterChartWidget';
import { HeatmapWidget } from './HeatmapWidget';
import { KPIWidget } from './KPIWidget';
import { TableWidget } from './TableWidget';
import { RadarChartWidget } from './RadarChartWidget';
import { RadialBarWidget } from './RadialBarWidget';
import { TreemapWidget } from './TreemapWidget';
import { FunnelWidget } from './FunnelWidget';
import { GaugeWidget } from './GaugeWidget';
import { WaterfallWidget } from './WaterfallWidget';
import { BubbleChartWidget } from './BubbleChartWidget';
import { ComboChartWidget } from './ComboChartWidget';

const CHART_MAP: Record<string, React.ComponentType<WidgetProps>> = {
  line: LineChartWidget,
  'multi-line': LineChartWidget,
  area: AreaChartWidget,
  'stacked-area': AreaChartWidget,
  bar: BarChartWidget,
  'horizontal-bar': BarChartWidget,
  'stacked-bar': BarChartWidget,
  pie: PieChartWidget,
  donut: PieChartWidget,
  scatter: ScatterChartWidget,
  heatmap: HeatmapWidget,
  kpi: KPIWidget,
  table: TableWidget,
  radar: RadarChartWidget,
  'radial-bar': RadialBarWidget,
  treemap: TreemapWidget,
  funnel: FunnelWidget,
  gauge: GaugeWidget,
  waterfall: WaterfallWidget,
  bubble: BubbleChartWidget,
  combo: ComboChartWidget,
};

function resolveConfig(spec: ChartSpec) {
  const config = { ...spec.config };
  if (spec.chartType === 'horizontal-bar') (config as any).horizontal = true;
  if (spec.chartType === 'stacked-bar' || spec.chartType === 'stacked-area') (config as any).stacked = true;
  if (spec.chartType === 'donut') (config as any).donut = true;
  return config;
}

interface ChartRendererProps {
  spec: ChartSpec;
  onMaximize?: () => void;
  onMore?: () => void;
}

export function ChartRenderer({ spec, onMaximize, onMore }: ChartRendererProps) {
  const Component = CHART_MAP[spec.chartType];

  if (!Component) {
    return (
      <ChartCard title={spec.title}>
        <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
          Unsupported chart type: {spec.chartType}
        </div>
      </ChartCard>
    );
  }

  if (spec.chartType === 'kpi') {
    return <Component data={spec.data} config={resolveConfig(spec)} />;
  }

  return (
    <ChartCard title={spec.title} onMaximize={onMaximize} onMore={onMore}>
      <Component data={spec.data} config={resolveConfig(spec)} />
    </ChartCard>
  );
}
