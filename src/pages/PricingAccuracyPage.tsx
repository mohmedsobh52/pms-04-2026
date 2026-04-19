import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { PageLayout } from '@/components/PageLayout';
import { NavigationBar } from '@/components/NavigationBar';
import { PricingAccuracyTab } from '@/components/tender/PricingAccuracyTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle2, TrendingUp, AlertTriangle, Database, Activity, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PricingAccuracyPage: React.FC = () => {
  const { isArabic } = useLanguage();
  const [stats, setStats] = useState({ total: 0, approved: 0, avgAccuracy: 0, avgDeviation: 0, highConfidence: 0 });
  const [confidenceDist, setConfidenceDist] = useState<{ label: string; count: number; color: string }[]>([]);
  const [topDeviations, setTopDeviations] = useState<any[]>([]);
  const [accuracyTrend, setAccuracyTrend] = useState<{ month: string; avg: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('pricing_history')
        .select('accuracy_score,deviation_percent,is_approved,confidence,item_description,item_number,created_at,suggested_price,final_price')
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

      // Confidence distribution
      const high = data.filter((r: any) => ['high', 'عالية'].includes(r.confidence)).length;
      const med = data.filter((r: any) => ['medium', 'متوسطة'].includes(r.confidence)).length;
      const low = data.filter((r: any) => ['low', 'منخفضة'].includes(r.confidence)).length;
      setConfidenceDist([
        { label: isArabic ? 'عالية' : 'High', count: high, color: 'bg-emerald-500' },
        { label: isArabic ? 'متوسطة' : 'Medium', count: med, color: 'bg-amber-500' },
        { label: isArabic ? 'منخفضة' : 'Low', count: low, color: 'bg-red-500' },
      ]);

      // Top deviations
      setTopDeviations(
        [...data]
          .filter((r: any) => r.is_approved && r.deviation_percent != null)
          .sort((a: any, b: any) => Math.abs(Number(b.deviation_percent)) - Math.abs(Number(a.deviation_percent)))
          .slice(0, 5)
      );

      // Monthly accuracy trend
      const monthMap = new Map<string, number[]>();
      data.forEach((r: any) => {
        if (!r.created_at || !r.accuracy_score) return;
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const arr = monthMap.get(key) || [];
        arr.push(Number(r.accuracy_score));
        monthMap.set(key, arr);
      });
      const trend = Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
        .map(([month, arr]) => ({ month, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) }));
      setAccuracyTrend(trend);
    })();
  }, [isArabic]);

  const totalConf = confidenceDist.reduce((s, c) => s + c.count, 0) || 1;
  const maxTrend = Math.max(...accuracyTrend.map((t) => t.avg), 100);

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
