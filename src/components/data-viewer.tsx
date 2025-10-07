"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface DataViewerProps {
  data: string[];
}

export default function DataViewer({ data }: DataViewerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Extracted Data</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72 w-full rounded-md border p-4">
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index}>
                <p className="text-sm">{item}</p>
                {index < data.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
