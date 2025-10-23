/**
 * @fileOverview Initializes and configures the Genkit AI toolkit.
 */

import { googleAI } from '@genkit-ai/google-genai';
import { genkit, ai } from 'genkit';

// Configure Genkit with the Google AI plugin.
// This should be done once per application instance.
genkit({
  plugins: [
    googleAI(),
  ],
});

// Export the configured ai object for use in other modules.
export { ai };
