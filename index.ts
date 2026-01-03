import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required');
    }

    console.log('Generating calculator for prompt:', prompt);

    const systemPrompt = `You are a calculator generator. Given a user's request, create a calculator specification.

IMPORTANT: You must respond with ONLY valid JSON, no markdown, no code blocks, just pure JSON.

The JSON must have this exact structure:
{
  "title": "Calculator Title",
  "description": "Brief description of what the calculator does",
  "inputs": [
    {
      "name": "variableName",
      "label": "Display Label",
      "type": "number",
      "placeholder": "Enter value",
      "defaultValue": 0
    }
  ],
  "formula": "JavaScript expression using input variable names (e.g., 'principal * (1 + rate/100) ** years')",
  "outputLabel": "Result Label"
}

Rules:
- Use simple, clear variable names in camelCase for inputs
- The formula must be a valid JavaScript math expression using the input variable names
- Support common operations: +, -, *, /, **, Math.sqrt(), Math.pow(), Math.round(), etc.
- For percentages, assume user enters as whole number (e.g., 5 for 5%) and divide by 100 in formula
- Keep formulas simple and accurate
- All inputs should be type "number"
- Provide sensible default values

Examples of good formulas:
- BMI: "weight / ((height / 100) ** 2)"
- Compound Interest: "principal * Math.pow(1 + rate / 100, years)"
- Tip Calculator: "billAmount * (tipPercent / 100)"
- Area of Circle: "Math.PI * radius ** 2"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a calculator for: ${prompt}` }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response:', content);

    // Parse the JSON response
    let calculator;
    try {
      // Remove any potential markdown code blocks
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      calculator = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse calculator JSON:', parseError, content);
      throw new Error('Failed to parse calculator specification');
    }

    // Validate the structure
    if (!calculator.title || !calculator.inputs || !calculator.formula) {
      throw new Error('Invalid calculator structure from AI');
    }

    console.log('Generated calculator:', calculator);

    return new Response(JSON.stringify(calculator), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-calculator:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
