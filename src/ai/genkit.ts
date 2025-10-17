/**
 * @fileoverview This file initializes the Genkit AI platform with the Google AI plugin.
 *
 * It configures a global 'ai' object that can be used throughout the application
 * to interact with generative models. This setup is crucial for defining AI flows,
 * prompts, and other generative AI functionalities.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1', // Specify the stable API version
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
