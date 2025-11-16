
'use client';

import React from 'react';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
);

export default function AppFooter() {
    const phoneNumber = "5585987987653";
    const message = "Olá! Poderia ajudar? Quero...";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return (
        <footer className="w-full max-w-7xl mx-auto mt-auto py-4 flex items-center justify-center text-center text-xs text-muted-foreground non-printable">
            <p>&copy; {new Date().getFullYear()} MestreJp. Todos os direitos reservados.</p>
            <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-4 text-primary hover:text-primary/80 transition-colors"
                aria-label="Contactar via WhatsApp"
            >
                <WhatsAppIcon className="h-5 w-5" />
            </a>
        </footer>
    );
}
