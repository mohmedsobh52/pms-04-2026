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
    const { fileContent, fileName, fileType, analysisType } = await req.json();
    
    if (!fileContent) {
      throw new Error('File content is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Analyzing file: ${fileName}, type: ${fileType}, analysis: ${analysisType}`);

    // Determine prompt based on analysis type
    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisType) {
      case 'extract_data':
        systemPrompt = `You are an expert document analyzer. Extract structured data from documents including:
- Tables and their contents
- Key-value pairs
- Lists and items
- Numbers and quantities
- Dates and references
Always respond in JSON format with clear structure.`;
        userPrompt = `Analyze this document content and extract all structured data:

File Name: ${fileName}
File Type: ${fileType}
Content:
${fileContent}

Return JSON with:
{
  "summary": "Brief summary of the document",
  "document_type": "Type of document (BOQ, Contract, Quote, etc.)",
  "extracted_data": {
    "tables": [...],
    "key_values": {...},
    "items": [...],
    "total_value": number or null,
    "currency": string or null
  },
  "recommendations": ["List of recommendations"]
}`;
        break;

      case 'summarize':
        systemPrompt = `You are an expert at summarizing construction and engineering documents. Provide concise but comprehensive summaries.`;
        userPrompt = `Summarize this document:

File Name: ${fileName}
Content:
${fileContent}

Provide a JSON response with:
{
  "title": "Document title",
  "summary": "Comprehensive summary (200-300 words)",
  "key_points": ["List of key points"],
  "document_type": "Type of document",
  "importance": "high/medium/low"
}`;
        break;

      case 'extract_boq':
        systemPrompt = `You are an expert BOQ (Bill of Quantities) analyzer. Extract all items, quantities, units, and prices from BOQ documents.`;
        userPrompt = `Extract BOQ data from this document:

File Name: ${fileName}
Content:
${fileContent}

Return JSON with:
{
  "items": [
    {
      "item_number": "string",
      "description": "string",
      "quantity": number,
      "unit": "string",
      "unit_price": number,
      "total_price": number,
      "category": "string"
    }
  ],
  "summary": {
    "total_items": number,
    "total_value": number,
    "currency": "string",
    "categories": ["list of categories"]
  }
}`;
        break;

      case 'cost_analysis':
        systemPrompt = `You are an expert cost analyst for construction projects. Analyze costs and provide insights.`;
        userPrompt = `Perform cost analysis on this document:

File Name: ${fileName}
Content:
${fileContent}

Return JSON with:
{
  "total_cost": number,
  "currency": "string",
  "cost_breakdown": {
    "materials": number,
    "labor": number,
    "equipment": number,
    "overhead": number,
    "profit": number
  },
  "cost_per_unit": {...},
  "market_comparison": "Analysis of costs vs market rates",
  "recommendations": ["List of cost optimization recommendations"],
  "risks": ["Potential cost risks"]
}`;
        break;

      default:
        systemPrompt = `You are an expert document analyzer for construction and engineering projects.`;
        userPrompt = `Analyze this document and provide insights:

File Name: ${fileName}
File Type: ${fileType}
Content:
${fileContent}

Provide analysis in JSON format.`;
    }

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

    console.log('Analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisResult,
      file_name: fileName,
      analysis_type: analysisType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
