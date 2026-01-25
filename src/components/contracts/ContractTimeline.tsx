import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock, AlertTriangle, Target, DollarSign, Milestone } from "lucide-react";
import { format, differenceInDays, isAfter, isBefore, isToday } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Contract {
  id: string;
  contract_title: string;
  contract_value: number | null;
  start_date: string | null;
  end_date: string | null;
}

interface MilestoneItem {
  id: string;
  type: "milestone";
  name: string;
  due_date: string;
  status: string;
  payment_percentage: number | null;
  payment_amount: number | null;
}

interface PaymentItem {
  id: string;
  type: "payment";
  name: string;
  due_date: string;
  status: string;
  amount: number;
  payment_number: number;
}

type TimelineItem = MilestoneItem | PaymentItem;

export const ContractTimeline = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<string>("");
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedContract) {
      fetchTimelineData();
    }
  }, [selectedContract]);

  const fetchContracts = async () => {
    try {
      const { data } = await supabase
        .from("contracts")
        .select("id, contract_title, contract_value, start_date, end_date")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      
      setContracts(data || []);
      if (data && data.length > 0) {
        setSelectedContract(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineData = async () => {
    try {
      const [milestonesRes, paymentsRes] = await Promise.all([
        supabase
          .from("contract_milestones")
          .select("*")
          .eq("contract_id", selectedContract)
          .order("due_date", { ascending: true }),
        supabase
          .from("contract_payments")
          .select("*")
          .eq("contract_id", selectedContract)
          .order("due_date", { ascending: true }),
      ]);

      const milestones: TimelineItem[] = (milestonesRes.data || []).map((m) => ({
        id: m.id,
        type: "milestone" as const,
        name: m.milestone_name,
        due_date: m.due_date,
        status: m.status,
        payment_percentage: m.payment_percentage,
        payment_amount: m.payment_amount,
      }));

      const payments: TimelineItem[] = (paymentsRes.data || []).map((p) => ({
        id: p.id,
        type: "payment" as const,
        name: p.description || `${isArabic ? "دفعة" : "Payment"} #${p.payment_number}`,
        due_date: p.due_date,
        status: p.status,
        amount: p.amount,
        payment_number: p.payment_number,
      }));

      const combined = [...milestones, ...payments].sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );

      setTimelineItems(combined);
    } catch (error) {
      console.error("Error fetching timeline data:", error);
    }
  };

  const getStatusIcon = (item: TimelineItem) => {
    const isOverdue = item.status !== "completed" && item.status !== "paid" && 
      isBefore(new Date(item.due_date), new Date());

    if (item.status === "completed" || item.status === "paid") {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (isOverdue) {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    if (item.status === "in_progress") {
      return <Target className="w-5 h-5 text-blue-500" />;
    }
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getStatusColor = (item: TimelineItem) => {
    const isOverdue = item.status !== "completed" && item.status !== "paid" && 
      isBefore(new Date(item.due_date), new Date());

    if (item.status === "completed" || item.status === "paid") return "bg-green-500";
    if (isOverdue) return "bg-red-500";
    if (item.status === "in_progress") return "bg-blue-500";
    return "bg-gray-300";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const selectedContractData = contracts.find(c => c.id === selectedContract);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contract Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 max-w-md">
              <Label>{isArabic ? "اختر العقد" : "Select Contract"}</Label>
              <Select value={selectedContract} onValueChange={setSelectedContract}>
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? "اختر عقد" : "Select a contract"} />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.contract_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedContractData && (
              <div className="text-sm text-muted-foreground">
                {selectedContractData.start_date && (
                  <span>
                    {isArabic ? "من:" : "From:"}{" "}
                    {format(new Date(selectedContractData.start_date), "dd/MM/yyyy")}
                  </span>
                )}
                {selectedContractData.end_date && (
                  <span className="ml-4">
                    {isArabic ? "إلى:" : "To:"}{" "}
                    {format(new Date(selectedContractData.end_date), "dd/MM/yyyy")}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Milestone className="w-5 h-5" />
            {isArabic ? "الجدول الزمني التفاعلي" : "Interactive Timeline"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timelineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isArabic ? "لا توجد معالم أو دفعات لهذا العقد" : "No milestones or payments for this contract"}
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border transform md:-translate-x-1/2" />

              <div className="space-y-8">
                {timelineItems.map((item, index) => {
                  const daysUntil = differenceInDays(new Date(item.due_date), new Date());
                  const isCompleted = item.status === "completed" || item.status === "paid";
                  const isOverdue = !isCompleted && daysUntil < 0;
                  const isTodays = isToday(new Date(item.due_date));

                  return (
                    <div
                      key={item.id}
                      className={`relative flex items-center gap-4 ${
                        index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                      }`}
                    >
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-4 md:left-1/2 w-8 h-8 rounded-full border-4 border-background flex items-center justify-center transform md:-translate-x-1/2 z-10 ${getStatusColor(item)}`}
                      >
                        {item.type === "milestone" ? (
                          <Target className="w-4 h-4 text-white" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div
                        className={`ml-16 md:ml-0 md:w-5/12 ${
                          index % 2 === 0 ? "md:pr-8 md:text-right" : "md:pl-8"
                        }`}
                      >
                        <Card className={`transition-all hover:shadow-md ${isTodays ? "ring-2 ring-primary" : ""} ${isOverdue ? "border-red-500/50" : ""}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(item)}
                                <span className="font-medium">{item.name}</span>
                              </div>
                              <Badge
                                variant="outline"
                                className={`${
                                  item.type === "milestone" ? "bg-purple-500/10 text-purple-600" : "bg-blue-500/10 text-blue-600"
                                }`}
                              >
                                {item.type === "milestone"
                                  ? (isArabic ? "معلم" : "Milestone")
                                  : (isArabic ? "دفعة" : "Payment")}
                              </Badge>
                            </div>

                            <div className="text-sm text-muted-foreground mb-2">
                              {format(new Date(item.due_date), "dd MMMM yyyy", {
                                locale: isArabic ? ar : enUS,
                              })}
                            </div>

                            {item.type === "milestone" && (item as MilestoneItem).payment_percentage && (
                              <div className="text-sm">
                                <span className="text-purple-600 font-medium">
                                  {(item as MilestoneItem).payment_percentage}%
                                </span>
                                {(item as MilestoneItem).payment_amount && (
                                  <span className="text-muted-foreground ml-2">
                                    ({formatCurrency((item as MilestoneItem).payment_amount!)})
                                  </span>
                                )}
                              </div>
                            )}

                            {item.type === "payment" && (
                              <div className="text-lg font-bold text-blue-600">
                                {formatCurrency((item as PaymentItem).amount)}
                              </div>
                            )}

                            {/* Days indicator */}
                            <div className="mt-2 text-xs">
                              {isCompleted ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                  {isArabic ? "مكتمل" : "Completed"}
                                </Badge>
                              ) : isOverdue ? (
                                <Badge variant="destructive">
                                  {isArabic ? `متأخر ${Math.abs(daysUntil)} يوم` : `${Math.abs(daysUntil)} days overdue`}
                                </Badge>
                              ) : isTodays ? (
                                <Badge className="bg-primary">
                                  {isArabic ? "اليوم!" : "Today!"}
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  {isArabic ? `بعد ${daysUntil} يوم` : `In ${daysUntil} days`}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Spacer for alternating layout */}
                      <div className="hidden md:block md:w-5/12" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
