"use client";

import { useRef, useState, useCallback, type DragEvent } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface XlsxUploaderProps {
  onUpload: (data: string[]) => void;
  setLoading: (loading: boolean) => void;
}

export default function XlsxUploader({ onUpload, setLoading }: XlsxUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file) {
      return;
    }

    if (!file.name.endsWith('.xlsx')) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a valid .xlsx file.",
      });
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Could not read file data.");
        
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const json: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const columnData = json
          .map(row => row[0])
          .filter(cell => cell !== null && cell !== undefined)
          .map(cell => String(cell));

        if (columnData.length === 0) {
          toast({
            variant: "destructive",
            title: "Empty Column",
            description: "The first column of your spreadsheet appears to be empty.",
          });
        } else {
          onUpload(columnData);
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Processing Error",
          description: "There was an error processing your file. It might be corrupted.",
        });
      } finally {
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
        toast({
            variant: "destructive",
            title: "File Read Error",
            description: "Could not read the selected file.",
        });
        setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }, [onUpload, setLoading, toast]);

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);
  
  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <Card 
      className={cn(
        "border-2 border-dashed border-border transition-all duration-200",
        isDragging ? "border-primary bg-accent/20" : "hover:border-muted-foreground"
      )}
    >
      <CardContent 
        className="p-6 text-center cursor-pointer" 
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4 h-52">
          <UploadCloud className="w-16 h-16 text-muted-foreground" />
          <div className="flex flex-col items-center">
            <p className="font-semibold text-foreground">
              <span className="text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-muted-foreground">
              XLSX files only
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
        </div>
      </CardContent>
    </Card>
  );
}
