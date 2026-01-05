import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Cloud, CheckCircle, ExternalLink, FolderSync, HardDrive, AlertCircle } from "lucide-react";

// Google Drive icon SVG
const GoogleDriveIcon = () => (
  <svg viewBox="0 0 87.3 78" className="w-6 h-6">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>
);

// OneDrive icon SVG  
const OneDriveIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <path d="M12.25 4.25a5.5 5.5 0 0 1 5.44 4.68A4.25 4.25 0 0 1 19.5 17H6.75a4.75 4.75 0 0 1-.93-9.4A5.5 5.5 0 0 1 12.25 4.25z" fill="#0364b8"/>
    <path d="M9.5 19.75h10.25a4.25 4.25 0 0 0 1.81-8.08A5.5 5.5 0 0 0 12.25 4.25a5.5 5.5 0 0 0-5.44 4.68A4.75 4.75 0 0 0 6.75 17h2.75z" fill="#0078d4"/>
    <path d="M6.75 17A4.75 4.75 0 0 1 5.81 7.6a5.5 5.5 0 0 1 6.44-3.35 5.5 5.5 0 0 1 4.31 5.43A4.25 4.25 0 0 1 19.5 17H6.75z" fill="#1490df"/>
    <path d="M9.5 19.75h10a3.25 3.25 0 0 0 .94-6.36A4.25 4.25 0 0 0 16.56 9.72a5.5 5.5 0 0 0-7.06-2.29z" fill="#28a8ea"/>
  </svg>
);

interface CloudStorageIntegrationProps {
  projectId?: string;
  onSync?: () => void;
}

export function CloudStorageIntegration({ projectId, onSync }: CloudStorageIntegrationProps) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const services = [
    {
      id: "google-drive",
      name: "Google Drive",
      icon: GoogleDriveIcon,
      description: isArabic 
        ? "حفظ ومزامنة الملفات تلقائياً مع Google Drive" 
        : "Auto-save and sync files with Google Drive",
      color: "bg-blue-500/10 border-blue-500/20",
      connected: false
    },
    {
      id: "onedrive",
      name: "OneDrive",
      icon: OneDriveIcon,
      description: isArabic 
        ? "ربط مع Microsoft OneDrive للحفظ السحابي" 
        : "Connect with Microsoft OneDrive for cloud storage",
      color: "bg-sky-500/10 border-sky-500/20",
      connected: false
    }
  ];

  const handleConnect = async (serviceId: string) => {
    setConnecting(serviceId);
    
    // Show info toast that this feature requires additional setup
    setTimeout(() => {
      toast({
        title: isArabic ? "قريباً" : "Coming Soon",
        description: isArabic 
          ? "هذه الميزة قيد التطوير. ستتوفر قريباً!" 
          : "This feature is under development. Coming soon!",
      });
      setConnecting(null);
    }, 1500);
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2"
        onClick={() => setShowDialog(true)}
      >
        <Cloud className="w-4 h-4" />
        {isArabic ? "التخزين السحابي" : "Cloud Storage"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              {isArabic ? "ربط التخزين السحابي" : "Cloud Storage Integration"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isArabic 
                ? "اربط مشروعك مع خدمات التخزين السحابي لحفظ الملفات تلقائياً ومزامنتها عبر الأجهزة." 
                : "Connect your project with cloud storage services to auto-save files and sync across devices."}
            </p>

            <div className="space-y-3">
              {services.map(service => {
                const Icon = service.icon;
                return (
                  <Card key={service.id} className={`transition-all ${service.color}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-background">
                            <Icon />
                          </div>
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {service.name}
                              {service.connected && (
                                <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {isArabic ? "متصل" : "Connected"}
                                </Badge>
                              )}
                            </h4>
                            <p className="text-xs text-muted-foreground">{service.description}</p>
                          </div>
                        </div>
                        <Button
                          variant={service.connected ? "outline" : "default"}
                          size="sm"
                          disabled={connecting === service.id}
                          onClick={() => handleConnect(service.id)}
                        >
                          {connecting === service.id ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                              {isArabic ? "جاري الاتصال..." : "Connecting..."}
                            </span>
                          ) : service.connected ? (
                            <>
                              <FolderSync className="w-4 h-4 mr-1" />
                              {isArabic ? "مزامنة" : "Sync"}
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4 mr-1" />
                              {isArabic ? "ربط" : "Connect"}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{isArabic ? "ملاحظة" : "Note"}</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic 
                      ? "يتطلب الربط مع الخدمات السحابية تسجيل الدخول وإعطاء الصلاحيات اللازمة. ملفاتك محمية وآمنة." 
                      : "Connecting to cloud services requires authentication and permissions. Your files are protected and secure."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HardDrive className="w-4 h-4" />
              <span>
                {isArabic 
                  ? "يتم حفظ الملفات حالياً في تخزين Lovable Cloud الآمن" 
                  : "Files are currently saved in secure Lovable Cloud storage"}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
