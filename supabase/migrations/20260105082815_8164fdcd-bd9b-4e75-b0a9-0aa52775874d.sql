-- Create subcontractors table
CREATE TABLE public.subcontractors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialty TEXT,
    license_number TEXT,
    rating NUMERIC(3,2),
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subcontractor assignments table
CREATE TABLE public.subcontractor_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    subcontractor_id UUID REFERENCES public.subcontractors(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.saved_projects(id) ON DELETE CASCADE,
    scope_of_work TEXT,
    contract_value NUMERIC,
    start_date DATE,
    end_date DATE,
    progress_percentage NUMERIC(5,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create BOQ templates table
CREATE TABLE public.boq_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    currency TEXT DEFAULT 'SAR',
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for subcontractors
CREATE POLICY "Users can view their own subcontractors" 
ON public.subcontractors FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subcontractors" 
ON public.subcontractors FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subcontractors" 
ON public.subcontractors FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subcontractors" 
ON public.subcontractors FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for subcontractor_assignments
CREATE POLICY "Users can view assignments of their subcontractors" 
ON public.subcontractor_assignments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.subcontractors 
        WHERE subcontractors.id = subcontractor_assignments.subcontractor_id 
        AND subcontractors.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create assignments for their subcontractors" 
ON public.subcontractor_assignments FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.subcontractors 
        WHERE subcontractors.id = subcontractor_assignments.subcontractor_id 
        AND subcontractors.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update assignments of their subcontractors" 
ON public.subcontractor_assignments FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.subcontractors 
        WHERE subcontractors.id = subcontractor_assignments.subcontractor_id 
        AND subcontractors.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete assignments of their subcontractors" 
ON public.subcontractor_assignments FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.subcontractors 
        WHERE subcontractors.id = subcontractor_assignments.subcontractor_id 
        AND subcontractors.user_id = auth.uid()
    )
);

-- RLS policies for boq_templates
CREATE POLICY "Users can view their own templates or public ones" 
ON public.boq_templates FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own templates" 
ON public.boq_templates FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.boq_templates FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.boq_templates FOR DELETE 
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_subcontractors_updated_at
BEFORE UPDATE ON public.subcontractors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subcontractor_assignments_updated_at
BEFORE UPDATE ON public.subcontractor_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boq_templates_updated_at
BEFORE UPDATE ON public.boq_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();