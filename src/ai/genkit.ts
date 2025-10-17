/**
 * @fileoverview This file initializes the Genkit AI instance with necessary plugins.
 * It exports a singleton `ai` object that should be used throughout the application
 * for any generative AI tasks.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import next from '@genkit-ai/next';

// Initialize the Genkit AI instance with the Google AI plugin.
// The `next()` plugin enables Genkit to work within the Next.js environment.
export const ai = genkit({
  plugins: [
    googleAI(),
    next({
      // These options are required for the Next.js plugin to work correctly.
      // You can leave them as is.
    }),
  ],
  // Log all AI-related activities to the console for debugging.
  logLevel: 'debug',
  // Enable OpenTelemetry for tracing and monitoring in production.
  enableTracingAndMetrics: true,
});
