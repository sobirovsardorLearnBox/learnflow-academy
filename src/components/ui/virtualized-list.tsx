import { memo, CSSProperties, useCallback } from 'react';
import { List, RowComponentProps } from 'react-window';

export interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  width?: number | string;
  className?: string;
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  overscanCount?: number;
}

interface RowData<T> {
  items: T[];
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
}

type RowProps<T> = RowComponentProps<RowData<T>>;

function VirtualizedListComponent<T>({ 
  items, 
  itemHeight, 
  height, 
  width = '100%', 
  className,
  renderItem,
  overscanCount = 5 
}: VirtualizedListProps<T>) {
  const rowData: RowData<T> = {
    items,
    renderItem,
  };

  const RowRenderer = useCallback(({ index, style, ...rowProps }: { 
    ariaAttributes: {
      "aria-posinset": number;
      "aria-setsize": number;
      role: "listitem";
    };
    index: number;
    style: CSSProperties;
  } & RowData<T>) => {
    const { items: itemsList, renderItem: render } = rowProps;
    const item = itemsList[index];
    return <>{render(item, index, style)}</>;
  }, []);

  return (
    <div style={{ height, width }} className={className}>
      <List
        rowCount={items.length}
        rowHeight={itemHeight}
        rowProps={rowData}
        rowComponent={RowRenderer}
        overscanCount={overscanCount}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}

export const VirtualizedList = memo(VirtualizedListComponent) as typeof VirtualizedListComponent;

// Auto-sized virtualized list height calculator
export function useVirtualizedListHeight(
  itemCount: number,
  itemHeight: number,
  minHeight: number = 200,
  maxHeight: number = 600
): number {
  return Math.min(Math.max(itemCount * itemHeight, minHeight), maxHeight);
}
