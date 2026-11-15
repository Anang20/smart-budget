/** Placeholder shown inside a card when a chart has no data yet. */
export default function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-md border border-dashed px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
