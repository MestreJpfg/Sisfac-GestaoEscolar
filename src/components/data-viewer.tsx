"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Printer } from "lucide-react";
import { Button } from "./ui/button";

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
  const [searchTerm, setSearchTerm] = useState("");
  const printableRef = useRef<HTMLDivElement>(null);

  const filteredData = data.filter((item) =>
    item.mainItem.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = (item: DataItem) => {
    if (printableRef.current) {
        let content = `<h1>${item.mainItem}</h1><ul>`;
        item.subItems.forEach(sub => {
            content += `<li><strong>${sub.label}:</strong> ${sub.value}</li>`;
        });
        content += '</ul>';
        printableRef.current.innerHTML = content;
        window.print();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Dados Extraídos</CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar item..."
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
              {filteredData.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>{item.mainItem}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex justify-end mb-2">
                        <Button variant="ghost" size="icon" onClick={() => handlePrint(item)}>
                            <Printer className="h-5 w-5" />
                        </Button>
                    </div>
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
      <div ref={printableRef} className="printable-content"></div>
    </Card>
  );
}
