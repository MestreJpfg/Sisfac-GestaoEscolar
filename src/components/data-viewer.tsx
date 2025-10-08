"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";

export interface DataItem {
  id: string;
  mainItem: string;
  subItems: { label: string; value: string }[];
  allColumns: string[];
}

interface DataViewerProps {
  data: DataItem[];
}

export default function DataViewer({ data }: DataViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = data.filter((item) =>
    item.mainItem.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Dados Extraídos</CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Visualização dos Dados</h3>
          <ScrollArea className="h-96 w-full rounded-md border">
            <Accordion type="single" collapsible className="w-full p-4">
              {filteredData.map((item) => (
                <AccordionItem value={item.id} key={item.id}>
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
