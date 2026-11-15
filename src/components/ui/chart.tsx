/**
 * chart.tsx
 * shadcn/ui chart primitives on top of Recharts.
 *
 * - ChartContainer: sizes the chart and exposes each series colour as a CSS variable
 *   (--color-<key>), so Recharts elements can use fill="var(--color-<key>)".
 * - ChartTooltipContent / ChartLegendContent: themed tooltip and legend that read
 *   labels and colours from the same `config`.
 *
 * Differences from the stock shadcn file: no dangerouslySetInnerHTML (colours are set as
 * inline CSS variables instead) and a `valueFormatter` prop for currency formatting.
 */
import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/utils';

// ─── Config & context ─────────────────────────────────────────────────────────

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    /** Any CSS colour, e.g. 'hsl(var(--chart-1))' */
    color?: string;
  }
>;

interface ChartContextProps {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart(): ChartContextProps {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('useChart must be used within a <ChartContainer />');
  return context;
}

/** Find the config entry for a tooltip / legend item (by name, then by key). */
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) return undefined;

  const inner =
    'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
      ? (payload.payload as Record<string, unknown>)
      : undefined;

  let configKey = key;
  const direct = (payload as Record<string, unknown>)[key];
  if (typeof direct === 'string') {
    configKey = direct;
  } else if (inner && typeof inner[key] === 'string') {
    configKey = inner[key] as string;
  }

  return configKey in config ? config[configKey] : config[key];
}

// ─── Container ────────────────────────────────────────────────────────────────

interface ChartContainerProps extends React.ComponentProps<'div'> {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, children, config, style, ...props }, ref) => {
    const colorVars = React.useMemo(() => {
      const vars: Record<string, string> = {};
      for (const [key, item] of Object.entries(config)) {
        if (item.color) vars[`--color-${key}`] = item.color;
      }
      return vars;
    }, [config]);

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          ref={ref}
          style={{ ...colorVars, ...style } as React.CSSProperties}
          className={cn(
            "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/60 [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
            className
          )}
          {...props}
        >
          <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  }
);
ChartContainer.displayName = 'ChartContainer';

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const ChartTooltip = RechartsPrimitive.Tooltip;

type ChartTooltipContentProps = React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: 'line' | 'dot' | 'dashed';
    nameKey?: string;
    labelKey?: string;
    /** Format numeric values (e.g. formatRupiah). Defaults to toLocaleString. */
    valueFormatter?: (value: number) => string;
  };

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      color,
      nameKey,
      labelKey,
      valueFormatter,
    },
    ref
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) return null;
      const [item] = payload;
      const key = `${labelKey || item.dataKey || item.name || 'value'}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && typeof label === 'string'
          ? config[label]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>;
      }
      if (!value) return null;
      return <div className={cn('font-medium', labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) return null;

    const nestLabel = payload.length === 1 && indicator !== 'dot';

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-xl border bg-card px-3 py-2 text-xs shadow-md',
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color || (item.payload as { fill?: string } | undefined)?.fill || item.color;
            const rawValue = item.value;
            const displayValue =
              typeof rawValue === 'number'
                ? (valueFormatter ?? ((v: number) => v.toLocaleString('id-ID')))(rawValue)
                : rawValue;

            return (
              <div
                key={`${item.dataKey ?? item.name ?? index}`}
                className={cn(
                  'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
                  indicator === 'dot' && 'items-center'
                )}
              >
                {itemConfig?.icon ? (
                  <itemConfig.icon />
                ) : (
                  !hideIndicator && (
                    <div
                      className={cn('shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]', {
                        'h-2.5 w-2.5': indicator === 'dot',
                        'w-1': indicator === 'line',
                        'w-0 border-[1.5px] border-dashed bg-transparent': indicator === 'dashed',
                        'my-0.5': nestLabel && indicator === 'dashed',
                      })}
                      style={
                        { '--color-bg': indicatorColor, '--color-border': indicatorColor } as React.CSSProperties
                      }
                    />
                  )
                )}
                <div
                  className={cn('flex flex-1 justify-between gap-4 leading-none', nestLabel ? 'items-end' : 'items-center')}
                >
                  <div className="grid gap-1.5">
                    {nestLabel ? tooltipLabel : null}
                    <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
                  </div>
                  {displayValue !== undefined && displayValue !== null && (
                    <span className="font-medium tabular-nums text-foreground">{displayValue}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

// ─── Legend ───────────────────────────────────────────────────────────────────

const ChartLegend = RechartsPrimitive.Legend;

type ChartLegendContentProps = React.ComponentProps<'div'> &
  Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
    hideIcon?: boolean;
    nameKey?: string;
  };

const ChartLegendContent = React.forwardRef<HTMLDivElement, ChartLegendContentProps>(
  ({ className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey }, ref) => {
    const { config } = useChart();
    if (!payload?.length) return null;

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center gap-4', verticalAlign === 'top' ? 'pb-3' : 'pt-3', className)}
      >
        {payload.map((item, index) => {
          const key = `${nameKey || item.dataKey || 'value'}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          return (
            <div
              key={`${item.value ?? index}`}
              className="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
              )}
              <span className="text-muted-foreground">{itemConfig?.label}</span>
            </div>
          );
        })}
      </div>
    );
  }
);
ChartLegendContent.displayName = 'ChartLegendContent';

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
