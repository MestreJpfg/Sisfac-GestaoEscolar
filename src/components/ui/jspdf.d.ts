// This file is to solve a type issue with jspdf and its autotable plugin.
// It ensures that TypeScript knows about the 'autoTable' method on the jsPDF instance.

import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}
