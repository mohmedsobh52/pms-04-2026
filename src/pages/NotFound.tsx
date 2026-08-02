import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Compass, Home, ArrowRight, LifeBuoy, FolderKanban } from "lucide-react";

const SUGGESTED = [
  { to: "/", ar: "الرئيسية", icon: Home },
  { to: "/projects", ar: "المشاريع", icon: FolderKanban },
  { to: "/dashboard", ar: "لوحة المتابعة", icon: Compass },
  { to: "/help", ar: "المساعدة", icon: LifeBuoy },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-lg w-full">
        <CardContent className="p-6 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Compass className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-muted-foreground mt-1">الصفحة المطلوبة غير موجودة</p>
            <p className="text-xs font-mono text-muted-foreground/80 mt-2 break-all">{location.pathname}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {SUGGESTED.map(({ to, ar, icon: Icon }) => (
              <Button key={to} variant="outline" asChild className="justify-start gap-2">
                <Link to={to}>
                  <Icon className="w-4 h-4" />
                  {ar}
                </Link>
              </Button>
            ))}
          </div>

          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            الرجوع للصفحة السابقة
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
