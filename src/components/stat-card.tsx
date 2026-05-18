
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: number | string | React.ReactNode;
    icon: React.ElementType;
    description?: string;
    action?: React.ReactNode;
}

export default function StatCard({ title, value, icon: Icon, description, action }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-md transition-all border-primary/10">
      {/* Ícone de Fundo (Marca d'água) */}
      <div className="absolute -right-4 -bottom-4 text-primary/5 group-hover:text-primary/10 transition-colors pointer-events-none">
        <Icon className="h-24 w-24" />
      </div>
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-primary/40 group-hover:text-primary transition-colors" />
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
            {description}
          </p>
        )}
      </CardContent>
      
      {action && (
        <CardFooter className="relative z-10 pt-2 pb-4">
            {action}
        </CardFooter>
      )}
    </Card>
  );
}
