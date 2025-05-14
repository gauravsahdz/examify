
'use server';
/**
 * @fileOverview AI-powered feedback summarization for admins.
 *
 * - summarizeFeedback - A function that summarizes user feedback on questions and tests.
 * - SummarizeFeedbackInput - The input type for the summarizeFeedback function.
 * - SummarizeFeedbackOutput - The return type for the summarizeFeedback function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SummarizeFeedbackInputSchema = z.object({
  feedbackText: z
    .string()
    .describe('The user feedback text to summarize.'),
  questionOrTest: z
    .string()
    .describe('The specific question or test the feedback is related to.'),
});
export type SummarizeFeedbackInput = z.infer<typeof SummarizeFeedbackInputSchema>;

const SummarizeFeedbackOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the user feedback.'),
  keyThemes: z.string().describe('Identified key themes or areas of concern from the feedback.'),
});
export type SummarizeFeedbackOutput = z.infer<typeof SummarizeFeedbackOutputSchema>;

export async function summarizeFeedback(input: SummarizeFeedbackInput): Promise<SummarizeFeedbackOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_GENAI_API_KEY is not set in the environment variables for summarizeFeedback flow.');
    throw new Error('AI configuration error: The GOOGLE_GENAI_API_KEY environment variable is missing. Please ensure it is set on the server.');
  }
  return summarizeFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeFeedbackPrompt',
  input: {
    schema: z.object({
      feedbackText: z
        .string()
        .describe('The user feedback text to summarize.'),
      questionOrTest: z
        .string()
        .describe('The specific question or test the feedback is related to.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A concise summary of the user feedback.'),
      keyThemes: z.string().describe('Identified key themes or areas of concern from the feedback.'),
    }),
  },
  prompt: `You are an AI assistant helping admins understand user feedback. Given the following feedback text for the question/test "{{{questionOrTest}}}", provide a concise summary and identify the key themes or areas of concern.\n\nFeedback Text: {{{feedbackText}}}`,
});

const summarizeFeedbackFlow = ai.defineFlow<
  typeof SummarizeFeedbackInputSchema,
  typeof SummarizeFeedbackOutputSchema
>({
  name: 'summarizeFeedbackFlow',
  inputSchema: SummarizeFeedbackInputSchema,
  outputSchema: SummarizeFeedbackOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});
