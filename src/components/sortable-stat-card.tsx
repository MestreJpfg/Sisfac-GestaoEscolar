
'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import StatCard from './stat-card';
import { cn } from '@/lib/utils';

interface SortableStatCardProps {
  id: string;
  title: string;
  value: number | string | React.ReactNode;
  icon: React.ElementType;
  description?: string;
  action?: React.ReactNode;
}

export function SortableStatCard({ id, ...props }: SortableStatCardProps) {
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
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 p-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/30 group-hover:text-muted-foreground/80 hover:bg-muted rounded-md transition-all z-20"
        title="Arraste para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <StatCard {...props} />
    </div>
  );
}
