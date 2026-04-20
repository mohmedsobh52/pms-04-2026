import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Building2,
  Star,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";
import { ExternalPartner } from "./PartnerCard";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface PartnerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: ExternalPartner | null;
  onEdit: (partner: ExternalPartner) => void;
  onDelete: (partner: ExternalPartner) => void;
}

export const PartnerDetailsDialog = ({
  open,
  onOpenChange,
  partner,
  onEdit,
  onDelete,
}: PartnerDetailsDialogProps) => {
  const { isArabic } = useLanguage();

  if (!partner) return null;

  const statusLabels = {
    active: isArabic ? "نشط" : "Active",
    inactive: isArabic ? "غير نشط" : "Inactive",
    pending: isArabic ? "معلق" : "Pending",
  };

  const statusColors = {
    active: "bg-green-500/10 text-green-600 border-green-500/20",
    inactive: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  };

  const typeLabels = {
    supplier: isArabic ? "مورد" : "Supplier",
    vendor: isArabic ? "بائع" : "Vendor",
    contractor: isArabic ? "مقاول" : "Contractor",
    consultant: isArabic ? "استشاري" : "Consultant",
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < Math.floor(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      );
    }
    return stars;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return isArabic ? "غير محدد" : "Not set";
    try {
      return format(new Date(dateString), "dd MMMM yyyy", {
        locale: isArabic ? ar : enUS,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isArabic ? "تفاصيل الشريك" : "Partner Details"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {partner.logo_url ? (
                <img
                  src={partner.logo_url}
                  alt={partner.name}
                  loading="lazy"
                  decoding="async"
                  className="w-14 h-14 rounded-xl object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">{partner.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {typeLabels[partner.partner_type]}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs ${statusColors[partner.status]}`}
                >
                  {statusLabels[partner.status]}
                </Badge>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            {renderStars(partner.rating)}
            <span className="text-sm font-medium">
              {partner.rating.toFixed(1)}/5
            </span>
          </div>

          {/* Description */}
          {partner.description && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">
                {isArabic ? "الوصف" : "Description"}
              </h4>
              <p className="text-sm">{partner.description}</p>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              {isArabic ? "معلومات التواصل" : "Contact Information"}
            </h4>

            {partner.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${partner.email}`} className="text-primary hover:underline">
                  {partner.email}
                </a>
              </div>
            )}

            {partner.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${partner.phone}`} className="hover:underline">
                  {partner.phone}
                </a>
              </div>
            )}

            {partner.website && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {partner.website}
                </a>
              </div>
            )}

            {partner.address && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span>{partner.address}</span>
              </div>
            )}
          </div>

          {/* Contract Period */}
          {(partner.contract_start_date || partner.contract_end_date) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {isArabic ? "فترة العقد" : "Contract Period"}
              </h4>
              <div className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg p-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {formatDate(partner.contract_start_date)} -{" "}
                  {formatDate(partner.contract_end_date)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          {partner.notes && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">
                {isArabic ? "ملاحظات" : "Notes"}
              </h4>
              <p className="text-sm text-muted-foreground">{partner.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(partner);
                onOpenChange(false);
              }}
            >
              <Trash2 className="w-4 h-4 me-2" />
              {isArabic ? "حذف" : "Delete"}
            </Button>

            <Button
              onClick={() => {
                onEdit(partner);
                onOpenChange(false);
              }}
            >
              <Pencil className="w-4 h-4 me-2" />
              {isArabic ? "تعديل" : "Edit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
