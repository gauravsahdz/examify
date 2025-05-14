'use server';

/**
 * @fileOverview An AI-powered question generator.
 *
 * - generateQuestions - A function that generates questions based on the topic and difficulty level.
 * - GenerateQuestionsInput - The input type for the generateQuestions function.
 * - GenerateQuestionsOutput - The return type for the generateQuestions function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { QuestionDifficulty } from '@/lib/enums'; // Ensure enum is imported if used

const GenerateQuestionsInputSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters.").describe('The topic for which to generate questions.'),
  difficulty: z.nativeEnum(QuestionDifficulty).describe('The difficulty level of the questions.'),
  numberOfQuestions: z.number().int().min(1, "Must generate at least 1 question.").max(10, "Cannot generate more than 10 questions at once.").default(5).describe('The number of questions to generate.'),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const GenerateQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The generated question.'),
      answer: z.string().describe('The answer to the question.'),
    })
  ).describe('An array of generated questions and answers.'),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;

export async function generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
   // Log the value of the API key to help diagnose server-side environment issues
   console.log("Checking for GOOGLE_GENAI_API_KEY..."); // Log message
   const apiKey = process.env.GOOGLE_GENAI_API_KEY;

   if (!apiKey) {
     console.error('GOOGLE_GENAI_API_KEY is not set in the environment variables.');
     // Provide a clearer error message indicating the specific problem (missing key)
     throw new Error('AI configuration error: The GOOGLE_GENAI_API_KEY environment variable is missing. Please ensure it is set on the server.');
   }
   console.log("GOOGLE_GENAI_API_KEY found."); // Log success if key exists

   return generateQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuestionsPrompt',
  input: {
    // Re-use the main input schema for the prompt input
    schema: GenerateQuestionsInputSchema,
  },
  output: {
    // Re-use the main output schema
    schema: GenerateQuestionsOutputSchema,
  },
  prompt: `You are an expert question generator for tests and quizzes.

  Generate {{numberOfQuestions}} questions for the topic: {{{topic}}}.
  The difficulty level of the questions should be: {{{difficulty}}}.

  Format each question as follows:
  {
    "question": "The question text",
    "answer": "The answer to the question"
  }

  Return the questions as a JSON object containing a "questions" array. Ensure the response is valid JSON.
  `,
});

const generateQuestionsFlow = ai.defineFlow<
  typeof GenerateQuestionsInputSchema,
  typeof GenerateQuestionsOutputSchema
>(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async input => {
    console.log("Executing generateQuestionsFlow with input:", input);
    try {
        const {output} = await prompt(input);
        if (!output) {
            console.error("AI model returned no output for input:", input);
            throw new Error("Received no output from the AI model.");
        }
        console.log("AI model returned output:", output);
        // Validate the output structure (basic check)
        if (!output.questions || !Array.isArray(output.questions)) {
             console.error("AI model returned invalid output format:", output);
             throw new Error("AI returned an unexpected output format.");
        }
        return output;
    } catch (error: any) {
        console.error("Error in generateQuestionsFlow execution:", error);
        // Provide a more informative error message
        throw new Error(`AI generation failed during flow execution: ${error.message || 'Unknown error'}`);
    }
  }
);