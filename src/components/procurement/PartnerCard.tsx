import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Star, Pencil, Calendar, Eye } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export interface ExternalPartner {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  rating: number;
  status: string;
  partner_type: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
  logo_url: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface PartnerCardProps {
  partner: ExternalPartner;
  onEdit: (partner: ExternalPartner) => void;
  onViewDetails?: (partner: ExternalPartner) => void;
}

export const PartnerCard = ({ partner, onEdit }: PartnerCardProps) => {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const statusLabels: Record<string, string> = {
    active: isArabic ? "نشط" : "Active",
    inactive: isArabic ? "غير نشط" : "Inactive",
    pending: isArabic ? "معلق" : "Pending",
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 border-green-500/20",
    inactive: "bg-muted text-muted-foreground border-muted",
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star key={i} className="w-4 h-4 fill-primary/50 text-primary" />
        );
      } else {
        stars.push(
          <Star key={i} className="w-4 h-4 text-muted-foreground/30" />
        );
      }
    }
    return stars;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "d MMM", {
        locale: isArabic ? ar : enUS,
      });
    } catch {
      return "";
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Logo/Icon */}
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={partner.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <Building2 className="w-6 h-6 text-primary" />
            )}
          </div>

          {/* Rating and Edit */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {renderStars(partner.rating)}
              <span className="text-sm text-muted-foreground ms-1">
                {partner.rating.toFixed(1)}/5
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onEdit(partner)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Name and Description */}
        <div className="mt-3 space-y-1">
          <h3 className="font-semibold text-lg line-clamp-1">{partner.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {partner.description || (isArabic ? "لا يوجد وصف" : "No description")}
          </p>
        </div>

        {/* Status and Date */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={`${statusColors[partner.status]} font-medium`}
          >
            {statusLabels[partner.status]}
          </Badge>

          {partner.contract_start_date && partner.contract_end_date && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {formatDate(partner.contract_start_date)} -{" "}
                {formatDate(partner.contract_end_date)}
              </span>
            </div>
          )}
        </div>

        {/* View Details Button */}
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => navigate(`/procurement/partner/${partner.id}`)}
        >
          <Eye className="w-4 h-4 me-2" />
          {isArabic ? "عرض التفاصيل" : "View Details"}
        </Button>
      </CardContent>
    </Card>
  );
};
