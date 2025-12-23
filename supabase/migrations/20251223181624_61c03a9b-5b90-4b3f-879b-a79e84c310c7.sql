-- Add table to store OCR extracted text for reuse
CREATE TABLE public.ocr_extracted_texts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quotation_id UUID REFERENCES public.price_quotations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  page_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_ocr_texts_quotation ON public.ocr_extracted_texts(quotation_id);
CREATE INDEX idx_ocr_texts_user ON public.ocr_extracted_texts(user_id);

-- Enable RLS
ALTER TABLE public.ocr_extracted_texts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own OCR texts
CREATE POLICY "Users can view their own OCR texts" 
ON public.ocr_extracted_texts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OCR texts" 
ON public.ocr_extracted_texts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OCR texts" 
ON public.ocr_extracted_texts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OCR texts" 
ON public.ocr_extracted_texts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_ocr_texts_updated_at
BEFORE UPDATE ON public.ocr_extracted_texts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add table for user notification preferences
CREATE TABLE public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_on_comments BOOLEAN DEFAULT true,
  email_on_mentions BOOLEAN DEFAULT true,
  email_on_analysis_complete BOOLEAN DEFAULT true,
  email_digest_frequency TEXT DEFAULT 'instant' CHECK (email_digest_frequency IN ('instant', 'daily', 'weekly', 'never')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_notification_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON public.user_notification_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_notification_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_notification_prefs_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();