import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { Phone, Mail, MapPin, Building2, Linkedin } from "lucide-react";
import developerPhoto from "@/assets/developer/mohamed-sobh.jpg";

const developer = {
  name: "Dr.Eng. Mohamed Sobh",
  titleAr: "مدير المشاريع",
  titleEn: "Projects Director",
  company: "AL IMTYAZ ALWATANIYA CONT.",
  phone: "+966 54 800 0243",
  email: "moh.sobh@imtyaz.sa",
  email2: "mohammed_sobh2020@yahoo.om",
  linkedin: "https://www.linkedin.com/in/mohamed-sobh-ab2083ba/",
  photo: developerPhoto,
  address: {
    ar: "شارع الأمير محمد بن عبدالعزيز، فندق WA، الدور 13، جدة 23453",
    en: "Prince Mohammed Bin Abdulaziz St., WA Hotel, 13th Floor, Jeddah 23453"
  }
};

interface ContactItemProps {
  icon: React.ElementType;
  value: string;
  href?: string;
}

function ContactItem({ icon: Icon, value, href }: ContactItemProps) {
  const content = (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
      </div>
      <span className="text-muted-foreground hover:text-foreground transition-colors">
        {value}
      </span>
    </div>
  );

  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="block hover:opacity-80 transition-opacity">
        {content}
      </a>
    );
  }

  return content;
}

export function DeveloperInfo() {
  const { isArabic } = useLanguage();

  return (
    <Card className="overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/30 flex-shrink-0">
            <img 
              src={developer.photo} 
              alt={developer.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">{developer.name}</h3>
            <p className="opacity-90">{isArabic ? developer.titleAr : developer.titleEn}</p>
            <p className="opacity-75 text-sm">{developer.company}</p>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h4 className="font-semibold">
            {isArabic ? "معلومات الاتصال" : "Contact Information"}
          </h4>
        </div>

        <div className="space-y-3">
          <ContactItem 
            icon={Phone} 
            value={developer.phone} 
            href={`tel:${developer.phone.replace(/\s/g, '')}`} 
          />
          <ContactItem 
            icon={Mail} 
            value={developer.email} 
            href={`mailto:${developer.email}`} 
          />
          <ContactItem 
            icon={Mail} 
            value={developer.email2} 
            href={`mailto:${developer.email2}`} 
          />
          <ContactItem 
            icon={Linkedin} 
            value={isArabic ? "الملف الشخصي على LinkedIn" : "LinkedIn Profile"} 
            href={developer.linkedin} 
          />
          <ContactItem 
            icon={MapPin} 
            value={isArabic ? developer.address.ar : developer.address.en} 
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function DeveloperInfoCompact() {
  const { isArabic } = useLanguage();

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{isArabic ? "تصميم وتطوير:" : "Designed & Developed by:"}</span>
      <span className="font-medium text-foreground">{developer.name}</span>
    </div>
  );
}
