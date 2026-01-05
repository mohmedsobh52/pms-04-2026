import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileName, fileType, drawingType } = await req.json();
    
    if (!fileContent) {
      throw new Error('File content is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Analyzing drawing: ${fileName}, type: ${drawingType}`);

    const systemPrompt = `You are an expert quantity surveyor and construction estimator. You specialize in analyzing architectural and engineering drawings (PDF, DWG) to extract quantities for Bill of Quantities (BOQ).

Your expertise includes:
- Reading and interpreting construction drawings
- Measuring quantities from drawings (areas, lengths, volumes, counts)
- Categorizing items according to standard BOQ formats
- Estimating material requirements
- Understanding construction specifications

Always respond in JSON format with structured quantity data.`;

    const userPrompt = `Analyze this construction drawing and extract all quantities for BOQ:

File Name: ${fileName}
Drawing Type: ${drawingType || 'General'}
File Content/Description:
${fileContent}

Extract and return JSON with:
{
  "drawing_info": {
    "title": "Drawing title",
    "type": "${drawingType || 'General'}",
    "scale": "Drawing scale if mentioned",
    "date": "Date if found"
  },
  "quantities": [
    {
      "item_number": "Sequential number",
      "category": "Category (Concrete, Steel, Masonry, Finishes, MEP, etc.)",
      "description": "Detailed item description",
      "quantity": number,
      "unit": "m2, m3, m, nos, kg, etc.",
      "measurement_basis": "How the quantity was calculated",
      "notes": "Any relevant notes"
    }
  ],
  "summary": {
    "total_items": number,
    "categories": ["List of categories found"],
    "main_materials": ["List of main materials"],
    "estimated_area": "If applicable",
    "estimated_volume": "If applicable"
  },
  "recommendations": ["List of recommendations for accurate estimation"],
  "assumptions": ["List of assumptions made during quantity takeoff"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          suggestion: 'Please try again in a few moments'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits exhausted',
          suggestion: 'Please add credits to continue using AI features'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    let analysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch {
      analysisResult = { raw_analysis: content };
    }

    console.log('Drawing analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisResult,
      file_name: fileName,
      drawing_type: drawingType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Drawing analysis error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
