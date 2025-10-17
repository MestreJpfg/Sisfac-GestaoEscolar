// src/components/google-analytics.tsx
"use client";
import Script from "next/script";

type Props = {
  ga_id: string;
};

const GoogleAnalytics = ({ ga_id }: Props) => {
  if (!ga_id || ga_id === "GA_MEASUREMENT_ID") {
    console.warn("Google Analytics ID is not set. Please update it in src/app/layout.tsx.");
    return null;
  }
  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${ga_id}`}
      ></Script>
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${ga_id}');
        `}
      </Script>
    </>
  );
};

export default GoogleAnalytics;
