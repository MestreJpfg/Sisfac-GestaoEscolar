/**
 * @fileoverview This file initializes the Genkit AI platform with the Google AI plugin.
 *
 * It configures a global 'ai' object that can be used throughout the application
 * to interact with generative models. This setup is crucial for defining AI flows,
 * prompts, and other generative AI functionalities.
 *
 * The configuration specifies the model to be used (gemini-1.5-flash-latest) and
 * sets the API version to 'v1' to ensure compatibility and access to the latest features.
 * It also defines the expected response MIME type as plain text.
 */
'use server';

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

export const model = 'googleai/gemini-1.5-flash-latest';
