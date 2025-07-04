
'use server';
/**
 * @fileOverview An AI agent for creating verifiable credential templates.
 *
 * - generateTemplate - A function that handles the template generation from a natural language prompt.
 * - GenerateTemplateInput - The input type for the generateTemplate function.
 * - GenerateTemplateOutput - The return type for the generateTemplate function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FieldSchema = z.object({
  fieldName: z.string().describe("The programmatic name for the field in camelCase, e.g., 'courseName' or 'studentFullName'. It must not contain spaces or special characters."),
  label: z.string().describe("The human-readable label for the field, e.g., 'Course Name'."),
  type: z.enum(['text', 'date', 'select', 'file']).describe("The type of the form field. Use 'select' for multiple choice options."),
  required: z.boolean().describe("Whether the field is mandatory."),
  options: z.array(z.string()).optional().describe("An array of choices, ONLY if the type is 'select'."),
  defaultValue: z.string().optional().describe("A default value for the field if specified."),
});

const TemplateSchema = z.object({
  name: z.string().describe("A concise name for the credential template, e.g., 'Certificate of Attendance'."),
  description: z.string().describe("A brief description of the template's purpose."),
  fields: z.array(FieldSchema).describe("An array of field definitions for the credential."),
});

export type GenerateTemplateOutput = z.infer<typeof TemplateSchema>;

const GenerateTemplateInputSchema = z.object({
  prompt: z.string().describe("A natural language description of the credential template to be generated."),
});
export type GenerateTemplateInput = z.infer<typeof GenerateTemplateInputSchema>;


export async function generateTemplate(input: GenerateTemplateInput): Promise<GenerateTemplateOutput> {
  return generateTemplateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTemplatePrompt',
  input: { schema: GenerateTemplateInputSchema },
  output: { schema: TemplateSchema },
  prompt: `You are an expert assistant specializing in creating technical schemas for verifiable credentials from natural language. Your task is to convert the user's description into a structured JSON object that defines a credential template.

  Analyze the user's request: {{{prompt}}}

  Follow these rules precisely:
  1.  **Infer a 'name' and 'description'** for the template based on the user's text. The name should be short and descriptive.
  2.  For each requested field, generate a **'fieldName' in camelCase**. For example, "Nombre del curso" should become "courseName". "Full Name" should be "fullName".
  3.  Identify the correct **'type'** for each field ('text', 'date', 'select', 'file'). Use 'select' for dropdowns or multiple choice options. Use 'file' if the user mentions attaching documents or PDFs.
  4.  Determine if a field is **'required'**. Assume fields are required unless specified as optional.
  5.  If it's a 'select' type, you MUST extract the options into the **'options'** array.
  6.  If a default value is specified (e.g., "by default the institution is..."), add it to the **'defaultValue'** field.
  7.  Structure the final output according to the provided JSON schema. Ensure every field has a label, fieldName, type, and required status.
  `,
});

const generateTemplateFlow = ai.defineFlow(
  {
    name: 'generateTemplateFlow',
    inputSchema: GenerateTemplateInputSchema,
    outputSchema: TemplateSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error("The AI model did not return a valid output.");
    }
    return output;
  }
);
