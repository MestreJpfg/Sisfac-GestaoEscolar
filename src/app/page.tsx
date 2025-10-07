"use client";

import { useState } from "react";
import XlsxUploader from "@/components/xlsx-uploader";
import DataViewer from "@/components/data-viewer";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [data, setData] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleReset = () => {
    setData(null);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-primary font-headline">
            XLSX Viewer
          </h1>
          <p className="text-muted-foreground mt-2">
            Import a spreadsheet to view the first column.
          </p>
        </header>

        <div className="w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Processing your file...</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              <DataViewer data={data} />
              <Button onClick={handleReset} className="w-full" variant="outline">
                Upload Another File
              </Button>
            </div>
          ) : (
            <XlsxUploader onUpload={setData} setLoading={setIsLoading} />
          )}
        </div>
      </div>
    </main>
  );
}
