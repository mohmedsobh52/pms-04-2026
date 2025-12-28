-- Create app_versions table to store version history
CREATE TABLE public.app_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version VARCHAR(20) NOT NULL UNIQUE,
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_latest BOOLEAN DEFAULT false,
  changes_ar TEXT[] NOT NULL DEFAULT '{}',
  changes_en TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read versions (public data)
CREATE POLICY "Anyone can view app versions" 
ON public.app_versions 
FOR SELECT 
USING (true);

-- Insert initial version data
INSERT INTO public.app_versions (version, release_date, is_latest, changes_ar, changes_en) VALUES
('2.0.0', '2024-12-01', false, 
  ARRAY['إطلاق النظام الأساسي', 'دعم تحليل BOQ', 'واجهة مستخدم عربية وإنجليزية'],
  ARRAY['Initial system launch', 'BOQ analysis support', 'Arabic and English UI']
),
('2.1.0', '2024-12-10', false,
  ARRAY['إضافة نظام المشاركة', 'تحسين تصدير PDF', 'إضافة الرسوم البيانية'],
  ARRAY['Added sharing system', 'Improved PDF export', 'Added charts']
),
('2.2.0', '2024-12-15', false,
  ARRAY['إضافة تحليل التكاليف', 'دعم عروض الأسعار', 'تحسين الأداء'],
  ARRAY['Added cost analysis', 'Quotation support', 'Performance improvements']
),
('2.3.0', '2024-12-20', false,
  ARRAY['إضافة نظام التعليقات', 'تحسين واجهة المستخدم', 'إصلاح الأخطاء'],
  ARRAY['Added comments system', 'UI improvements', 'Bug fixes']
),
('2.4.0', '2024-12-25', false,
  ARRAY['إضافة مخططات WBS', 'تحسين التقارير', 'دعم P6 Export'],
  ARRAY['Added WBS diagrams', 'Improved reports', 'P6 Export support']
),
('2.5.0', '2024-12-28', true,
  ARRAY['نظام الربط ثنائي الاتجاه بين تحليل التكاليف والبنود', 'تحسين عرض جدول تحليل التكاليف', 'خاصية التحكم في عرض الأعمدة', 'نظام التحقق التلقائي من التحديثات', 'صفحة سجل التحديثات'],
  ARRAY['Bidirectional linking between cost analysis and items', 'Improved cost analysis table display', 'Column visibility control', 'Automatic update checking system', 'Changelog page']
);

-- Create index for faster queries
CREATE INDEX idx_app_versions_is_latest ON public.app_versions(is_latest);
CREATE INDEX idx_app_versions_release_date ON public.app_versions(release_date DESC);