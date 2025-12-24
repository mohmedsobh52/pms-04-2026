import { Link } from "react-router-dom";
import { GitMerge, ArrowRight, Target, Lightbulb, Users, Shield, Rocket, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/hooks/useLanguage";

const About = () => {
  const { isArabic } = useLanguage();

  const values = [
    {
      icon: Target,
      titleAr: "الدقة",
      titleEn: "Accuracy",
      descAr: "نسعى لتقديم أعلى مستويات الدقة في تحليل جداول الكميات",
      descEn: "We strive to deliver the highest accuracy in BOQ analysis"
    },
    {
      icon: Lightbulb,
      titleAr: "الابتكار",
      titleEn: "Innovation",
      descAr: "نستخدم أحدث تقنيات الذكاء الاصطناعي لتطوير حلولنا",
      descEn: "We use cutting-edge AI technologies to develop our solutions"
    },
    {
      icon: Users,
      titleAr: "سهولة الاستخدام",
      titleEn: "User-Friendly",
      descAr: "نصمم أدواتنا لتكون سهلة الاستخدام للجميع",
      descEn: "We design our tools to be easy to use for everyone"
    },
    {
      icon: Shield,
      titleAr: "الأمان",
      titleEn: "Security",
      descAr: "نحمي بياناتك ومشاريعك بأعلى معايير الأمان",
      descEn: "We protect your data and projects with the highest security standards"
    }
  ];

  const stats = [
    { valueAr: "+10,000", valueEn: "10,000+", labelAr: "مشروع تم تحليله", labelEn: "Projects Analyzed" },
    { valueAr: "+500,000", valueEn: "500,000+", labelAr: "بند تم استخراجه", labelEn: "Items Extracted" },
    { valueAr: "+1,000", valueEn: "1,000+", labelAr: "مستخدم نشط", labelEn: "Active Users" },
    { valueAr: "99%", valueEn: "99%", labelAr: "نسبة الرضا", labelEn: "Satisfaction Rate" }
  ];

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <GitMerge className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold gradient-text">BOQ Analyzer</h1>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "تحليل جداول الكميات بالذكاء الاصطناعي" : "AI-powered BOQ Analysis"}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="outline" size="sm">
                  {isArabic ? "الرئيسية" : "Home"}
                </Button>
              </Link>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 gradient-text animate-fade-in">
            {isArabic ? "من نحن" : "About Us"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: "100ms" }}>
            {isArabic 
              ? "BOQ Analyzer هو حل متكامل لتحليل جداول الكميات باستخدام الذكاء الاصطناعي، نهدف إلى تبسيط عملية تحليل المشاريع الإنشائية وتوفير الوقت والجهد للمهندسين والمقاولين"
              : "BOQ Analyzer is a comprehensive solution for analyzing Bills of Quantities using AI. We aim to simplify construction project analysis and save time and effort for engineers and contractors"}
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold">
                  {isArabic ? "رسالتنا" : "Our Mission"}
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {isArabic 
                  ? "نسعى لتحويل طريقة عمل المهندسين والمقاولين من خلال توفير أدوات ذكية تساعدهم على تحليل جداول الكميات بدقة وسرعة. نؤمن بأن التقنية يجب أن تخدم الإنسان وتسهل عمله، لذلك نصمم أدواتنا لتكون بسيطة وفعالة."
                  : "We strive to transform how engineers and contractors work by providing intelligent tools that help them analyze BOQs accurately and quickly. We believe technology should serve people and simplify their work, which is why we design our tools to be simple and effective."}
              </p>
              <Link to="/">
                <Button className="gap-2">
                  {isArabic ? "ابدأ الآن" : "Get Started"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <Card key={index} className="text-center p-6 animate-fade-in hover:shadow-lg transition-shadow" style={{ animationDelay: `${index * 100}ms` }}>
                  <CardContent className="p-0">
                    <p className="text-3xl font-bold gradient-text mb-2">
                      {isArabic ? stat.valueAr : stat.valueEn}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? stat.labelAr : stat.labelEn}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Award className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-bold">
                {isArabic ? "قيمنا" : "Our Values"}
              </h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isArabic 
                ? "نلتزم بمجموعة من القيم التي توجه عملنا وتشكل هويتنا"
                : "We are committed to a set of values that guide our work and shape our identity"}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="text-center p-6 animate-fade-in hover:border-primary/50 transition-colors" style={{ animationDelay: `${index * 100}ms` }}>
                <CardContent className="p-0">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {isArabic ? value.titleAr : value.titleEn}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? value.descAr : value.descEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              {isArabic ? "التقنيات المستخدمة" : "Technologies We Use"}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              {isArabic 
                ? "نستخدم أحدث تقنيات الذكاء الاصطناعي ومعالجة اللغات الطبيعية لتحليل جداول الكميات. تشمل تقنياتنا التعرف الضوئي على الحروف (OCR)، واستخراج البيانات الهيكلية، وتحليل الأسعار، وإنشاء التقارير التفاعلية."
                : "We use the latest AI and NLP technologies to analyze Bills of Quantities. Our technologies include Optical Character Recognition (OCR), structured data extraction, price analysis, and interactive report generation."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {["AI/ML", "OCR", "NLP", "React", "TypeScript", "Supabase", "PDF Processing", "Excel Export"].map((tech, index) => (
                <span
                  key={index}
                  className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-t from-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            {isArabic ? "جاهز للبدء؟" : "Ready to Get Started?"}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            {isArabic 
              ? "ابدأ بتحليل جداول الكميات الخاصة بك الآن مجاناً"
              : "Start analyzing your Bills of Quantities now for free"}
          </p>
          <Link to="/">
            <Button size="lg" className="gap-2">
              {isArabic ? "ابدأ التحليل الآن" : "Start Analyzing Now"}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 BOQ Analyzer. {isArabic ? "جميع الحقوق محفوظة" : "All rights reserved."}</p>
        </div>
      </footer>
    </div>
  );
};

export default About;
