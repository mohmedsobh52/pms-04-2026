import { PageLayout } from "@/components/PageLayout";
import { LibraryDatabase } from "@/components/LibraryDatabase";
import { useLanguage } from "@/hooks/useLanguage";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home, Library } from "lucide-react";
import { Link } from "react-router-dom";

const LibraryPage = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                <Library className="h-4 w-4" />
                {isArabic ? "المكتبة" : "Library"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Library className="h-6 w-6" />
            {isArabic ? "المكتبة" : "Library"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isArabic 
              ? "إدارة المواد وأسعار العمالة والمعدات"
              : "Manage materials, labor rates, and equipment prices"
            }
          </p>
        </div>
        
        <LibraryDatabase />
      </div>
    </PageLayout>
  );
};

export default LibraryPage;
