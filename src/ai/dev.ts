'use server';

/**
 * @fileoverview This is a development-only server file used to run the Genkit Developer UI.
 * It should not be included in the production build.
 * It imports all flows to make them available in the developer UI.
 *
 * To run the developer UI, use the command: `npm run genkit:dev` or `genkit dev`
 */

import { dev } from 'genkit/dev';
import { ai } from './genkit';

// Import all flows here so they are discoverable by the developer UI.
import './flows/knowledgeAssistant';

dev(ai);
