/**
 * @fileOverview Initializes and configures the Genkit AI toolkit.
 */

import { googleAI } from '@genkit-ai/google-genai';
import { genkit, ai } from 'genkit';

let configured = false;
export function configureGenkitOnce() {
  if (!configured) {
    genkit({
      plugins: [googleAI()],
      // Log level is configured via environment variables in Genkit v1.x
      // enableTracingAndMetrics is now on by default in dev.
    });
    configured = true;
  }
}

export { ai };
