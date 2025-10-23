/**
 * @fileOverview Initializes and configures the Genkit AI toolkit.
 * This file creates and exports a single, configured 'ai' instance.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize and configure the AI instance in one step.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  // Log level is configured via environment variables in Genkit v1.x
  // enableTracingAndMetrics is now on by default in dev.
});
