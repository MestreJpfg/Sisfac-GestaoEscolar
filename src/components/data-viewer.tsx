"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface DataItem {
  mainItem: string;
  subItems: { label: string; value: string }[];
  allColumns: string[];
}

interface DataViewerProps {
  data: DataItem[];
  columnHeaders: string[];
}

export default function DataViewer({ data, columnHeaders }: DataViewerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Dados Extraídos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Campos de Texto por Coluna</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {columnHeaders.map((header, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`col-input-${index}`} className="text-muted-foreground">{header}</Label>
                <Input id={`col-input-${index}`} placeholder={`Dados para ${header}...`} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Visualização dos Dados</h3>
          <ScrollArea className="h-96 w-full rounded-md border">
            <Accordion type="single" collapsible className="w-full p-4">
              {data.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>{item.mainItem}</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pl-4">
                      {item.subItems.map((sub, subIndex) => (
                        <li key={subIndex} className="text-sm">
                          <span className="font-semibold text-muted-foreground">{sub.label}:</span>
                          <span className="ml-2 text-foreground">{sub.value}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
