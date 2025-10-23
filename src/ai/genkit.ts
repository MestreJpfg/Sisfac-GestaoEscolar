
import { googleAI } from '@genkit-ai/google-genai';
import { ai, configureGenkit } from 'genkit';

/**
 * Initializes and configures the Genkit AI toolkit for the application.
 * This sets up the Google AI plugin, allowing access to models like Gemini.
 * The `ai` object is exported for use in defining flows and tools.
 */
configureGenkit({
  plugins: [
    googleAI({
      // The API version can be specified here. 'v1beta' is a common choice for access
      // to the latest features.
      apiVersion: 'v1beta',
    }),
  ],
  // Log level for debugging Genkit operations. Can be 'debug', 'info', 'warn', 'error'.
  logLevel: 'debug',
  // Enables storing traces in the development environment for easier debugging.
  enableTracingAndMetrics: true,
});

export { ai };
