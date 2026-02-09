import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Star, MessageCircle, DollarSign, Pencil, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface PerformanceData {
  id?: string;
  partner_id: string;
  delivery_time_score: number;
  quality_score: number;
  communication_score: number;
  budget_compliance_score: number;
}

interface PartnerPerformanceProps {
  partnerId: string;
}

export const PartnerPerformance = ({ partnerId }: PartnerPerformanceProps) => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    delivery_time_score: 0,
    quality_score: 0,
    communication_score: 0,
    budget_compliance_score: 0,
  });

  useEffect(() => {
    if (user && partnerId) {
      fetchPerformance();
    }
  }, [user, partnerId]);

  const fetchPerformance = async () => {
    try {
      const { data, error } = await supabase
        .from("partner_performance")
        .select("*")
        .eq("partner_id", partnerId)
        .eq("user_id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setPerformance(data);
        setFormData({
          delivery_time_score: data.delivery_time_score || 0,
          quality_score: data.quality_score || 0,
          communication_score: data.communication_score || 0,
          budget_compliance_score: data.budget_compliance_score || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching performance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      if (performance?.id) {
        // Update
        const { error } = await supabase
          .from("partner_performance")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", performance.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from("partner_performance").insert([
          {
            partner_id: partnerId,
            user_id: user.id,
            ...formData,
          },
        ]);

        if (error) throw error;
      }

      toast.success(isArabic ? "تم حفظ الأداء" : "Performance saved");
      setDialogOpen(false);
      fetchPerformance();
    } catch (error) {
      console.error("Error saving performance:", error);
      toast.error(isArabic ? "خطأ في الحفظ" : "Error saving");
    } finally {
      setIsSaving(false);
    }
  };

  const metrics = [
    {
      key: "delivery_time_score",
      label: isArabic ? "الالتزام بالمواعيد" : "Delivery Time",
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      key: "quality_score",
      label: isArabic ? "جودة العمل" : "Quality Score",
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      key: "communication_score",
      label: isArabic ? "التواصل" : "Communication",
      icon: MessageCircle,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      key: "budget_compliance_score",
      label: isArabic ? "الالتزام بالميزانية" : "Budget Compliance",
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 card-actions-safe relative">
          <CardTitle className="text-lg font-semibold">
            {isArabic ? "مؤشرات الأداء" : "Performance Metrics"}
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDialogOpen(true)}
            className="z-[65] pointer-events-auto"
          >
            <Pencil className="w-4 h-4 me-1" />
            {isArabic ? "تعديل" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map((metric) => {
                const score = performance?.[metric.key as keyof PerformanceData] as number || 0;
                const Icon = metric.icon;

                return (
                  <div
                    key={metric.key}
                    className="p-4 rounded-lg border bg-card text-center"
                  >
                    <div
                      className={`w-10 h-10 rounded-full ${metric.bgColor} flex items-center justify-center mx-auto mb-3`}
                    >
                      <Icon className={`w-5 h-5 ${metric.color}`} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {metric.label}
                    </p>
                    <p className="text-2xl font-bold mb-2">{score}%</p>
                    <Progress 
                      value={score} 
                      className="h-1.5"
                      style={{
                        // @ts-ignore
                        '--progress-background': getScoreColor(score).replace('bg-', '')
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent 
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {isArabic ? "تعديل مؤشرات الأداء" : "Edit Performance Metrics"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {metrics.map((metric) => (
              <div key={metric.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{metric.label}</Label>
                  <span className="text-sm font-medium">
                    {formData[metric.key as keyof typeof formData]}%
                  </span>
                </div>
                <Slider
                  value={[formData[metric.key as keyof typeof formData]]}
                  onValueChange={([value]) =>
                    setFormData((prev) => ({
                      ...prev,
                      [metric.key]: value,
                    }))
                  }
                  max={100}
                  step={1}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {isArabic ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
