import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MapPin, Calendar, DollarSign } from "lucide-react";

interface HistoricalFile {
  id: string;
  file_name: string;
  project_name: string;
  project_location: string | null;
  project_date: string | null;
  currency: string;
  items: any[];
  items_count: number;
  total_value: number;
  notes: string | null;
  is_verified: boolean;
  created_at: string;
}

interface HistoricalPricingStatsProps {
  files: HistoricalFile[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const LOCATION_LABELS: Record<string, string> = {
  "Riyadh": "الرياض",
  "Jeddah": "جدة",
  "Dammam": "الدمام",
  "Makkah": "مكة المكرمة",
  "Madinah": "المدينة المنورة",
  "Khobar": "الخبر",
  "Tabuk": "تبوك",
  "Other": "أخرى",
};

export function HistoricalPricingStats({ files }: HistoricalPricingStatsProps) {
  // Stats by location
  const locationStats = useMemo(() => {
    const stats: Record<string, { count: number; totalValue: number; totalItems: number }> = {};
    
    files.forEach(file => {
      const loc = file.project_location || "غير محدد";
      if (!stats[loc]) {
        stats[loc] = { count: 0, totalValue: 0, totalItems: 0 };
      }
      stats[loc].count += 1;
      stats[loc].totalValue += file.total_value || 0;
      stats[loc].totalItems += file.items_count || 0;
    });
    
    return Object.entries(stats).map(([location, data]) => ({
      location: LOCATION_LABELS[location] || location,
      files: data.count,
      value: Math.round(data.totalValue / 1000000), // in millions
      items: data.totalItems,
    }));
  }, [files]);

  // Stats by time period
  const timeStats = useMemo(() => {
    const stats: Record<string, { count: number; totalValue: number }> = {};
    
    files.forEach(file => {
      if (file.project_date) {
        const date = new Date(file.project_date);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!stats[yearMonth]) {
          stats[yearMonth] = { count: 0, totalValue: 0 };
        }
        stats[yearMonth].count += 1;
        stats[yearMonth].totalValue += file.total_value || 0;
      }
    });
    
    return Object.entries(stats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12) // Last 12 months
      .map(([period, data]) => {
        const [year, month] = period.split('-');
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return {
          period: `${monthNames[parseInt(month) - 1]} ${year}`,
          files: data.count,
          value: Math.round(data.totalValue / 1000000),
        };
      });
  }, [files]);

  // Average prices by item category (from descriptions)
  const categoryStats = useMemo(() => {
    const categories: Record<string, { total: number; count: number }> = {};
    
    files.forEach(file => {
      (file.items || []).forEach((item: any) => {
        const desc = (item.description || '').toLowerCase();
        let category = 'أخرى';
        
        if (desc.includes('خرسان') || desc.includes('concrete')) category = 'الخرسانة';
        else if (desc.includes('حديد') || desc.includes('steel') || desc.includes('rebar')) category = 'الحديد';
        else if (desc.includes('حفر') || desc.includes('excavat')) category = 'الحفريات';
        else if (desc.includes('عزل') || desc.includes('insulation') || desc.includes('waterproof')) category = 'العزل';
        else if (desc.includes('دهان') || desc.includes('paint')) category = 'الدهانات';
        else if (desc.includes('كهرب') || desc.includes('electric')) category = 'الكهرباء';
        else if (desc.includes('سباك') || desc.includes('plumb')) category = 'السباكة';
        else if (desc.includes('تكييف') || desc.includes('hvac') || desc.includes('air')) category = 'التكييف';
        
        if (!categories[category]) {
          categories[category] = { total: 0, count: 0 };
        }
        categories[category].total += item.unit_price || 0;
        categories[category].count += 1;
      });
    });
    
    return Object.entries(categories)
      .filter(([_, data]) => data.count > 0)
      .map(([category, data]) => ({
        category,
        avgPrice: Math.round(data.total / data.count),
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [files]);

  // Verification status
  const verificationStats = useMemo(() => {
    const verified = files.filter(f => f.is_verified).length;
    const unverified = files.length - verified;
    return [
      { name: 'موثق', value: verified, color: '#10b981' },
      { name: 'غير موثق', value: unverified, color: '#f59e0b' },
    ];
  }, [files]);

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        إحصائيات وتحليلات البيانات التاريخية
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              توزيع المشاريع حسب الموقع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={locationStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="location" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'files') return [`${value} ملف`, 'عدد الملفات'];
                    if (name === 'value') return [`${value} مليون`, 'القيمة'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="files" fill="#3b82f6" name="files" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              توزيع المشاريع حسب الفترة الزمنية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timeStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'files') return [`${value} ملف`, 'عدد الملفات'];
                    if (name === 'value') return [`${value} مليون`, 'القيمة'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="files" stroke="#3b82f6" name="files" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="value" stroke="#10b981" name="value" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Average Prices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              متوسط الأسعار حسب التصنيف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'avgPrice') return [`${value.toLocaleString()} ريال`, 'متوسط السعر'];
                    if (name === 'count') return [`${value} بند`, 'عدد البنود'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="avgPrice" fill="#8b5cf6" name="avgPrice" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Verification Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">حالة التوثيق</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={verificationStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {verificationStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} ملف`, 'العدد']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Location Value Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">مقارنة القيم الإجمالية حسب الموقع (بالمليون)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="location" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'value') return [`${value} مليون`, 'القيمة الإجمالية'];
                  if (name === 'items') return [`${value} بند`, 'عدد البنود'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" name="value" radius={[4, 4, 0, 0]} />
              <Bar dataKey="items" fill="#10b981" name="items" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
