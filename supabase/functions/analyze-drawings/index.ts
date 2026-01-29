import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const { userId, error: authError } = await verifyAuth(req);
  if (authError) {
    return authError;
  }
  console.log(`Authenticated user: ${userId}`);

  try {
    const { fileContent, fileUrl, imageBase64, images, fileName, fileType, drawingType, language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Analyzing drawing: ${fileName}, type: ${drawingType}, language: ${language || 'en'}`);

    const isArabic = language === 'ar';

    // Specialized prompt for infrastructure/networks (excavation, backfilling, pipes)
    const infrastructurePromptArabic = `أنت خبير حصر كميات متخصص في أعمال شبكات المياه والصرف والبنية التحتية.

المطلوب استخراجه بالتفصيل:

### 1. أعمال الحفر (Excavation):
- حفر الخنادق: الطول × العرض × العمق = الحجم (م³)
- حفر غرف التفتيش: العدد والأبعاد
- التفريق بين: حفر عادي / حفر صخري / حفر في مياه جوفية
- category = "Excavation"
- subcategory = نوع الحفر (Trench Excavation, Rock Excavation, Normal Excavation)

### 2. أعمال الردم (Backfilling):
- فرشة رملية تحت المواسير (سمك 10-15 سم)
- ردم جوانب المواسير (رمل أو تربة محسنة)
- ردم نهائي فوق المواسير (تربة عادية)
- حساب كل طبقة بشكل منفصل
- category = "Backfilling"
- subcategory = نوع الردم (Sand Bedding, Selected Backfill, Normal Backfill)

### 3. المواسير (Pipes):
لكل نوع من المواسير أذكر:
- النوع (uPVC, HDPE, GRP, Steel, Ductile Iron)
- القطر بالبوصة والمليمتر
- الطول الإجمالي (م.ط)
- category = "Pipes"
- subcategory = نوع الماسورة
- pipe_diameter = القطر (مثال: "150mm / 6 inch")
- pipe_material = المادة (مثال: "uPVC")

### 4. القطع والتركيبات (Fittings):
- المحابس (Valves): العدد لكل قطر - category = "Valves"
- الكيعان (Elbows): العدد لكل قطر - category = "Fittings"
- النقاط T و Y - category = "Fittings"
- وصلات الفلنج - category = "Fittings"

### 5. غرف التفتيش (Manholes):
- عدد الغرف
- الأبعاد والعمق لكل غرفة
- category = "Manholes"

مهم جداً:
- أعد النتائج بتنسيق JSON مع category و subcategory واضح لكل بند
- اذكر measurement_basis لتوضيح كيف تم حساب الكمية
- للمواسير: اذكر pipe_diameter و pipe_material

يجب الرد بصيغة JSON مع بيانات الكميات المهيكلة.`;

    const infrastructurePromptEnglish = `You are an expert quantity surveyor specializing in water networks, sewerage, and infrastructure works.

Extract the following in detail:

### 1. Excavation Works:
- Trench excavation: Length × Width × Depth = Volume (m³)
- Manhole excavation: Count and dimensions
- Distinguish between: Normal excavation / Rock excavation / Excavation in groundwater
- category = "Excavation"
- subcategory = Type (Trench Excavation, Rock Excavation, Normal Excavation)

### 2. Backfilling Works:
- Sand bedding under pipes (10-15 cm thickness)
- Side filling (sand or selected material)
- Final backfill above pipes (normal soil)
- Calculate each layer separately
- category = "Backfilling"
- subcategory = Type (Sand Bedding, Selected Backfill, Normal Backfill)

### 3. Pipes:
For each pipe type specify:
- Material (uPVC, HDPE, GRP, Steel, Ductile Iron)
- Diameter in inches and mm
- Total length (linear meters)
- category = "Pipes"
- subcategory = Pipe type
- pipe_diameter = Diameter (e.g., "150mm / 6 inch")
- pipe_material = Material (e.g., "uPVC")

### 4. Fittings & Accessories:
- Valves: Count per diameter - category = "Valves"
- Elbows: Count per diameter - category = "Fittings"
- Tees and Y-pieces - category = "Fittings"
- Flange connections - category = "Fittings"

### 5. Manholes:
- Number of manholes
- Dimensions and depth for each
- category = "Manholes"

Important:
- Return results in JSON format with clear category and subcategory for each item
- Include measurement_basis to explain how quantity was calculated
- For pipes: include pipe_diameter and pipe_material

Always respond in JSON format with structured quantity data.`;

    const systemPromptEnglish = `You are an expert quantity surveyor and construction estimator. You specialize in analyzing architectural and engineering drawings (PDF, DWG) to extract quantities for Bill of Quantities (BOQ).

Your expertise includes:
- Reading and interpreting construction drawings
- Measuring quantities from drawings (areas, lengths, volumes, counts)
- Categorizing items according to standard BOQ formats
- Estimating material requirements
- Understanding construction specifications

Always respond in JSON format with structured quantity data.`;

    const systemPromptArabic = `أنت خبير مساحة كميات ومقاول إنشائي متخصص في قراءة وتحليل المخططات الهندسية.

مهامك:
1. قراءة المخطط وفهم جميع العناصر الإنشائية
2. حساب الكميات بدقة (المساحات، الأطوال، الأحجام، الأعداد)
3. تصنيف البنود حسب نظام BOQ القياسي
4. تقدير متطلبات المواد

أنواع الكميات المطلوبة:
- أعمال الحفر والردم (م³)
- الخرسانة بأنواعها (م³)
- حديد التسليح (كجم/طن)
- أعمال البناء (م²/م³)
- التشطيبات (م²)
- أعمال MEP (عدد/متر طولي)

ملاحظات مهمة:
- استخرج الكميات من المقاسات المكتوبة على المخطط
- إذا لم تجد مقاساً، قدّر من المقياس
- اذكر أساس القياس لكل بند

يجب الرد بصيغة JSON مع بيانات الكميات المهيكلة.`;

    // Select appropriate system prompt based on drawing type
    let systemPrompt: string;
    if (drawingType === 'infrastructure') {
      systemPrompt = isArabic ? infrastructurePromptArabic : infrastructurePromptEnglish;
    } else {
      systemPrompt = isArabic ? systemPromptArabic : systemPromptEnglish;
    }

    // Infrastructure-specific user prompts
    const infrastructureUserPromptEnglish = `Analyze this infrastructure/network drawing and extract ALL quantities for BOQ with focus on:
- Excavation works (trenches, manholes) with dimensions
- Backfilling works (sand bedding, selected fill, normal fill) with volumes
- All pipe types with EXACT diameters and lengths
- Fittings (valves, elbows, tees) with counts per diameter
- Manholes with dimensions

File Name: ${fileName}
Drawing Type: Infrastructure/Networks
${fileContent ? `File Content/Description:\n${fileContent}` : ''}

Return JSON with this EXACT structure:
{
  "drawing_info": {
    "title": "Drawing title",
    "type": "infrastructure",
    "scale": "Drawing scale if mentioned",
    "date": "Date if found"
  },
  "quantities": [
    {
      "item_number": "1",
      "category": "Excavation",
      "subcategory": "Trench Excavation",
      "description": "Trench excavation for water pipes depth 1.5m",
      "quantity": 850,
      "unit": "m³",
      "measurement_basis": "Length 450m × Width 1.2m × Depth 1.5m",
      "pipe_diameter": null,
      "pipe_material": null,
      "notes": ""
    },
    {
      "item_number": "2",
      "category": "Pipes",
      "subcategory": "uPVC Water Pipes",
      "description": "uPVC pipes 6 inch (150mm)",
      "quantity": 450,
      "unit": "m",
      "measurement_basis": "Total length from drawing",
      "pipe_diameter": "150mm / 6 inch",
      "pipe_material": "uPVC",
      "notes": ""
    },
    {
      "item_number": "3",
      "category": "Backfilling",
      "subcategory": "Sand Bedding",
      "description": "Sand bedding under pipes 10cm thick",
      "quantity": 54,
      "unit": "m³",
      "measurement_basis": "Length 450m × Width 1.2m × Depth 0.1m",
      "pipe_diameter": null,
      "pipe_material": null,
      "notes": ""
    }
  ],
  "summary": {
    "total_items": 3,
    "categories": ["Excavation", "Pipes", "Backfilling"],
    "main_materials": ["uPVC", "Sand"],
    "estimated_area": "",
    "estimated_volume": ""
  }
}

IMPORTANT: 
- Extract EVERY pipe with its specific diameter
- Calculate excavation volumes based on trench dimensions
- Separate backfilling into layers (bedding, selected fill, normal fill)`;

    const infrastructureUserPromptArabic = `قم بتحليل مخطط شبكات البنية التحتية هذا واستخراج جميع الكميات لجدول الكميات (BOQ) مع التركيز على:
- أعمال الحفر (الخنادق، غرف التفتيش) مع الأبعاد
- أعمال الردم (فرشة رملية، ردم محسن، ردم عادي) مع الأحجام
- جميع أنواع المواسير مع الأقطار والأطوال بالتحديد
- القطع والتركيبات (محابس، كيعان، نقاط T) مع الأعداد لكل قطر
- غرف التفتيش مع الأبعاد

اسم الملف: ${fileName}
نوع المخطط: شبكات وبنية تحتية
${fileContent ? `محتوى الملف/الوصف:\n${fileContent}` : ''}

أعد JSON بهذا الهيكل بالضبط:
{
  "drawing_info": {
    "title": "عنوان المخطط",
    "type": "infrastructure",
    "scale": "مقياس الرسم إن وجد",
    "date": "التاريخ إن وجد"
  },
  "quantities": [
    {
      "item_number": "1",
      "category": "Excavation",
      "subcategory": "Trench Excavation",
      "description": "حفر خنادق لمواسير المياه عمق 1.5م",
      "quantity": 850,
      "unit": "م³",
      "measurement_basis": "الطول 450م × العرض 1.2م × العمق 1.5م",
      "pipe_diameter": null,
      "pipe_material": null,
      "notes": ""
    },
    {
      "item_number": "2",
      "category": "Pipes",
      "subcategory": "uPVC Water Pipes",
      "description": "مواسير uPVC قطر 6 بوصة (150مم)",
      "quantity": 450,
      "unit": "م.ط",
      "measurement_basis": "إجمالي الطول من المخطط",
      "pipe_diameter": "150mm / 6 inch",
      "pipe_material": "uPVC",
      "notes": ""
    },
    {
      "item_number": "3",
      "category": "Backfilling",
      "subcategory": "Sand Bedding",
      "description": "فرشة رملية تحت المواسير سمك 10سم",
      "quantity": 54,
      "unit": "م³",
      "measurement_basis": "الطول 450م × العرض 1.2م × السمك 0.1م",
      "pipe_diameter": null,
      "pipe_material": null,
      "notes": ""
    }
  ],
  "summary": {
    "total_items": 3,
    "categories": ["Excavation", "Pipes", "Backfilling"],
    "main_materials": ["uPVC", "رمل"],
    "estimated_area": "",
    "estimated_volume": ""
  }
}

مهم جداً:
- استخرج كل ماسورة مع قطرها المحدد
- احسب أحجام الحفر بناءً على أبعاد الخندق
- افصل الردم إلى طبقات (فرشة، ردم محسن، ردم عادي)`;

    const userPromptEnglish = `Analyze this construction drawing and extract all quantities for BOQ:

File Name: ${fileName}
Drawing Type: ${drawingType || 'General'}
${fileContent ? `File Content/Description:\n${fileContent}` : ''}

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
      "subcategory": "Sub-category if applicable",
      "description": "Detailed item description",
      "quantity": number,
      "unit": "m2, m3, m, nos, kg, etc.",
      "measurement_basis": "How the quantity was calculated",
      "pipe_diameter": "For pipes only",
      "pipe_material": "For pipes only",
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

    const userPromptArabic = `قم بتحليل هذا المخطط الإنشائي واستخراج جميع الكميات لجدول الكميات (BOQ):

اسم الملف: ${fileName}
نوع المخطط: ${drawingType || 'عام'}
${fileContent ? `محتوى الملف/الوصف:\n${fileContent}` : ''}

استخرج وأرجع JSON بالتنسيق التالي:
{
  "drawing_info": {
    "title": "عنوان المخطط",
    "type": "${drawingType || 'عام'}",
    "scale": "مقياس الرسم إن وجد",
    "date": "التاريخ إن وجد"
  },
  "quantities": [
    {
      "item_number": "رقم تسلسلي",
      "category": "الفئة (خرسانة، حديد، بناء، تشطيبات، أعمال كهروميكانيكية، إلخ)",
      "subcategory": "الفئة الفرعية إن وجدت",
      "description": "وصف تفصيلي للبند",
      "quantity": رقم,
      "unit": "م²، م³، م.ط، عدد، كجم، إلخ",
      "measurement_basis": "أساس حساب الكمية",
      "pipe_diameter": "للمواسير فقط",
      "pipe_material": "للمواسير فقط",
      "notes": "أي ملاحظات ذات صلة"
    }
  ],
  "summary": {
    "total_items": رقم,
    "categories": ["قائمة الفئات الموجودة"],
    "main_materials": ["قائمة المواد الرئيسية"],
    "estimated_area": "إن وجد",
    "estimated_volume": "إن وجد"
  },
  "recommendations": ["قائمة التوصيات للتقدير الدقيق"],
  "assumptions": ["قائمة الافتراضات المستخدمة في حصر الكميات"]
}`;

    // Select appropriate user prompt based on drawing type
    let userPrompt: string;
    if (drawingType === 'infrastructure') {
      userPrompt = isArabic ? infrastructureUserPromptArabic : infrastructureUserPromptEnglish;
    } else {
      userPrompt = isArabic ? userPromptArabic : userPromptEnglish;
    }

    // Build message content based on what's provided
    let messageContent: any;

    // Check if PDF URL was provided without base64 conversion - this won't work
    if (fileUrl && fileType?.includes('pdf') && !imageBase64 && (!images || images.length === 0)) {
      console.error('PDF URL provided without base64 images - PDFs must be converted to images first');
      return new Response(JSON.stringify({ 
        error: isArabic 
          ? 'يجب تحويل ملفات PDF إلى صور قبل التحليل. يرجى المحاولة مرة أخرى.'
          : 'PDF files must be converted to images before analysis. Please try again.',
        success: false,
        requiresImageConversion: true
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If we have multiple images (multi-page PDF converted to images)
    if (images && Array.isArray(images) && images.length > 0) {
      messageContent = [
        { type: 'text', text: userPrompt },
        ...images.map((img: string) => ({
          type: 'image_url',
          image_url: {
            url: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
            detail: 'high'
          }
        }))
      ];
    } else if (imageBase64) {
      // Single image (base64)
      const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;
      messageContent = [
        { type: 'text', text: userPrompt },
        { 
          type: 'image_url', 
          image_url: { 
            url: imageUrl,
            detail: 'high'
          } 
        }
      ];
    } else if (fileUrl && fileType?.includes('image')) {
      // Direct image URL (not PDF) - can be used directly
      messageContent = [
        { type: 'text', text: userPrompt },
        { 
          type: 'image_url', 
          image_url: { 
            url: fileUrl,
            detail: 'high'
          } 
        }
      ];
    } else if (images && Array.isArray(images) && images.length > 0) {
      // Multiple images (multi-page PDF)
      messageContent = [
        { type: 'text', text: userPrompt },
        ...images.map((img: string) => ({
          type: 'image_url',
          image_url: {
            url: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
            detail: 'high'
          }
        }))
      ];
    } else {
      // Text only - no images provided
      messageContent = userPrompt;
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
          { role: 'user', content: messageContent }
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
          suggestion: isArabic ? 'يرجى المحاولة مرة أخرى بعد لحظات' : 'Please try again in a few moments'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits exhausted',
          suggestion: isArabic ? 'يرجى إضافة رصيد للاستمرار في استخدام ميزات الذكاء الاصطناعي' : 'Please add credits to continue using AI features'
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
