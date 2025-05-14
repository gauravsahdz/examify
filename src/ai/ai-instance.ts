
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  console.warn(
    '\n*********************************************************************\n' +
    'WARNING: GOOGLE_GENAI_API_KEY is not set in environment variables.\n' +
    'AI features requiring this key (e.g., question generation, feedback summary) will fail.\n' +
    'Please set it in your .env.local file or server environment.\n' +
    'Example .env.local: \nGOOGLE_GENAI_API_KEY=your_actual_api_key_here\n' +
    'Make sure to restart your development server after setting the key.\n' +
    '*********************************************************************\n'
  );
}

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: apiKey, // Use the variable
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
