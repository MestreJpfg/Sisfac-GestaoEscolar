
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
        className="absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-colors z-10"
        title="Arraste para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <StatCard {...props} />
    </div>
  );
}
