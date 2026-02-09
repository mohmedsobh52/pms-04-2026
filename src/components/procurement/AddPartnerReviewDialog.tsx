import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";

interface AddPartnerReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  onSuccess: () => void;
}

export const AddPartnerReviewDialog = ({
  open,
  onOpenChange,
  partnerId,
  onSuccess,
}: AddPartnerReviewDialogProps) => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    reviewer_name: "",
    rating: 0,
    review_text: "",
  });

  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSave = async () => {
    if (!user) return;
    if (!formData.reviewer_name.trim()) {
      toast.error(isArabic ? "يرجى إدخال اسم المقيّم" : "Please enter reviewer name");
      return;
    }
    if (formData.rating === 0) {
      toast.error(isArabic ? "يرجى اختيار التقييم" : "Please select a rating");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("partner_reviews").insert([
        {
          partner_id: partnerId,
          user_id: user.id,
          reviewer_name: formData.reviewer_name,
          rating: formData.rating,
          review_text: formData.review_text || null,
        },
      ]);

      if (error) throw error;

      toast.success(isArabic ? "تم إضافة التقييم" : "Review added");
      setFormData({ reviewer_name: "", rating: 0, review_text: "" });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving review:", error);
      toast.error(isArabic ? "خطأ في حفظ التقييم" : "Error saving review");
    } finally {
      setIsSaving(false);
    }
  };

  const renderStarSelector = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isActive = i <= (hoveredRating || formData.rating);
      stars.push(
        <button
          key={i}
          type="button"
          className="p-1 transition-transform hover:scale-110"
          onMouseEnter={() => setHoveredRating(i)}
          onMouseLeave={() => setHoveredRating(0)}
          onClick={() => setFormData({ ...formData, rating: i })}
        >
          <Star
            className={`w-7 h-7 ${
              isActive
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      );
    }
    return stars;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isArabic ? "إضافة تقييم جديد" : "Add New Review"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>{isArabic ? "اسم المقيّم" : "Reviewer Name"} *</Label>
            <Input
              value={formData.reviewer_name}
              onChange={(e) =>
                setFormData({ ...formData, reviewer_name: e.target.value })
              }
              placeholder={isArabic ? "أدخل اسم المقيّم" : "Enter reviewer name"}
            />
          </div>

          <div className="space-y-2">
            <Label>{isArabic ? "التقييم" : "Rating"} *</Label>
            <div className="flex items-center gap-1">{renderStarSelector()}</div>
          </div>

          <div className="space-y-2">
            <Label>{isArabic ? "نص التقييم" : "Review Text"}</Label>
            <Textarea
              value={formData.review_text}
              onChange={(e) =>
                setFormData({ ...formData, review_text: e.target.value })
              }
              placeholder={isArabic ? "اكتب تقييمك هنا..." : "Write your review here..."}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
            {isArabic ? "إضافة" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
