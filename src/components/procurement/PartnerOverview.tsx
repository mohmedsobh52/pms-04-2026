import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, User, Phone, Mail, Globe, MapPin } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { ExternalPartner } from "./PartnerCard";

interface PartnerOverviewProps {
  partner: ExternalPartner;
}

export const PartnerOverview = ({ partner }: PartnerOverviewProps) => {
  const { isArabic } = useLanguage();

  const partnerTypeLabels: Record<string, string> = {
    supplier: isArabic ? "مورد" : "Supplier",
    vendor: isArabic ? "بائع" : "Vendor",
    contractor: isArabic ? "مقاول" : "Contractor",
    consultant: isArabic ? "استشاري" : "Consultant",
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        );
      } else {
        stars.push(
          <Star key={i} className="w-4 h-4 text-muted-foreground/30" />
        );
      }
    }
    return stars;
  };

  // Access category and contact_person safely using type assertion
  const partnerWithExtras = partner as ExternalPartner & { 
    category?: string; 
    contact_person?: string; 
  };

  return (
    <Card>
      <CardContent className="p-6">
        {/* Top Row - 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          {/* Rating */}
          <div>
            <p className="text-sm text-muted-foreground mb-1.5">
              {isArabic ? "التقييم" : "Rating"}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {renderStars(partner.rating)}
              </div>
              <span className="text-sm font-medium">
                {partner.rating.toFixed(1)}/5
              </span>
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-sm text-muted-foreground mb-1.5">
              {isArabic ? "الفئة" : "Category"}
            </p>
            <p className="font-medium">
              {partnerWithExtras.category || (isArabic ? "غير محدد" : "Not specified")}
            </p>
          </div>

          {/* Partner Type */}
          <div>
            <p className="text-sm text-muted-foreground mb-1.5">
              {isArabic ? "نوع الشريك" : "Partner Type"}
            </p>
            <Badge variant="outline" className="font-medium">
              <User className="w-3 h-3 me-1" />
              {partnerTypeLabels[partner.partner_type] || partner.partner_type}
            </Badge>
          </div>

          {/* Contact Person */}
          <div>
            <p className="text-sm text-muted-foreground mb-1.5">
              {isArabic ? "جهة الاتصال" : "Contact Person"}
            </p>
            <p className="font-medium">
              {partnerWithExtras.contact_person || (isArabic ? "غير محدد" : "Not specified")}
            </p>
          </div>
        </div>

        {/* Description */}
        {partner.description && (
          <div className="mb-4 pb-4 border-b">
            <p className="text-sm text-muted-foreground mb-1">
              {isArabic ? "الوصف / الخدمات" : "Role/Services"}
            </p>
            <p className="text-foreground">{partner.description}</p>
          </div>
        )}

        {/* Contact Info Row */}
        <div className="flex flex-wrap gap-6">
          {partner.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a
                href={`tel:${partner.phone}`}
                className="hover:text-primary transition-colors"
              >
                {partner.phone}
              </a>
            </div>
          )}

          {partner.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a
                href={`mailto:${partner.email}`}
                className="hover:text-primary transition-colors"
              >
                {partner.email}
              </a>
            </div>
          )}

          {partner.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                {partner.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}

          {partner.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{partner.address}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
