import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function SortableItem({ id, children, className }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isDragging && 'z-50 opacity-90 shadow-lg',
        className
      )}
    >
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 cursor-grab hover:bg-accent rounded touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="pl-8">
        {children}
      </div>
    </div>
  );
}

interface DragHandleProps {
  listeners?: ReturnType<typeof useSortable>['listeners'];
  attributes?: ReturnType<typeof useSortable>['attributes'];
}

export function DragHandle({ listeners, attributes }: DragHandleProps) {
  return (
    <button
      {...attributes}
      {...listeners}
      className="p-1 cursor-grab hover:bg-accent rounded touch-none"
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}
