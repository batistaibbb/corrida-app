import { useState } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';

interface DragDropListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  onRemove?: (index: number) => void;
  getItemId?: (item: T, index: number) => string;
}

export default function DragDropList<T>({
  items,
  onReorder,
  renderItem,
  onRemove,
  getItemId,
}: DragDropListProps<T>) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newItems = [...items];
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(dragOverIndex, 0, removed);
      onReorder(newItems);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const key = getItemId ? getItemId(item, index) : index.toString();
        return (
        <div
          key={key}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-start gap-2 p-3 border rounded-lg transition-all ${
            draggedIndex === index
              ? 'opacity-50 border-emerald-500 bg-emerald-50'
              : dragOverIndex === index
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="cursor-move text-slate-400 hover:text-slate-600 pt-2">
            <GripVertical className="w-5 h-5" />
          </div>
          <div className="flex-1">{renderItem(item, index)}</div>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        );
      })}
    </div>
  );
}
