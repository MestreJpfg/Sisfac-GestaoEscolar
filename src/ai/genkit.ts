/**
 * @fileOverview Initializes and configures the Genkit AI toolkit.
 */

import { googleAI } from '@genkit-ai/google-genai';
import { genkit, ai } from 'genkit';

/**
 * Initializes and configures the Genkit AI toolkit for the application.
 * This sets up the Google AI plugin, allowing access to models like Gemini.
 * The `ai` object is exported for use in defining flows and tools.
 */
genkit({
  plugins: [
    googleAI(),
  ],
  // Log level is configured via environment variables in Genkit v1.x
  // enableTracingAndMetrics is now on by default in dev.
});

export { ai };
