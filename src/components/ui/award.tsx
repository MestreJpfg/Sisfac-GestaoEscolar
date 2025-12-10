
'use client';

import * as React from "react";

const Award = (props: React.SVGProps<SVGSVGElement>) => (
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
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 17 17 23 15.79 13.88" />
  </svg>
);

export default Award;
