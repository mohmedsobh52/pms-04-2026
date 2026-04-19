import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { PageLayout } from '@/components/PageLayout';
import { NavigationBar } from '@/components/NavigationBar';
import { PricingAccuracyTab } from '@/components/tender/PricingAccuracyTab';
import { Card, CardContent } from '@/components/ui/card';
import { Target, CheckCircle2, TrendingUp, AlertTriangle, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PricingAccuracyPage: React.FC = () => {
  const { isArabic } = useLanguage();
  const [stats, setStats] = useState({ total: 0, approved: 0, avgAccuracy: 0, avgDeviation: 0, highConfidence: 0 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('pricing_history')
        .select('accuracy_score,deviation_percent,is_approved,confidence')
        .eq('user_id', user.id);
      if (!data) return;
      const accs = data.map((r: any) => Number(r.accuracy_score)).filter((n) => !isNaN(n) && n > 0);
      const devs = data.map((r: any) => Math.abs(Number(r.deviation_percent))).filter((n) => !isNaN(n));
      setStats({
        total: data.length,
        approved: data.filter((r: any) => r.is_approved).length,
        avgAccuracy: accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : 0,
        avgDeviation: devs.length ? Math.round((devs.reduce((a, b) => a + b, 0) / devs.length) * 10) / 10 : 0,
        highConfidence: data.filter((r: any) => r.confidence === 'high' || r.confidence === 'عالية').length,
      });
    })();
  }, []);

  const cards = [
    { label: isArabic ? 'إجمالي السجلات' : 'Total Records', value: stats.total.toLocaleString(), icon: Database, color: 'text-primary', bg: 'bg-primary/10' },
    { label: isArabic ? 'معتمدة' : 'Approved', value: stats.approved.toLocaleString(), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: isArabic ? 'متوسط الدقة' : 'Avg Accuracy', value: `${stats.avgAccuracy}%`, icon: Target, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: isArabic ? 'متوسط الانحراف' : 'Avg Deviation', value: `${stats.avgDeviation}%`, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: isArabic ? 'ثقة عالية' : 'High Confidence', value: stats.highConfidence.toLocaleString(), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-500/10' },
  ];

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
        <NavigationBar showBreadcrumbs />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {cards.map((c) => (
            <Card key={c.label} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${c.bg}`}>
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{c.label}</div>
                  <div className={`text-lg font-bold ${c.color}`}>{c.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <PricingAccuracyTab isArabic={isArabic} />
      </div>
    </PageLayout>
  );
};

export default PricingAccuracyPage;
