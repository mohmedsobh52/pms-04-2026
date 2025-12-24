import { useState } from "react";
import { FileText, Edit3, Check, X, Eye, Split, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface TextPreviewEditorProps {
  text: string;
  fileName?: string;
  onConfirm: (editedText: string) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function TextPreviewEditor({ 
  text, 
  fileName, 
  onConfirm, 
  onCancel,
  isProcessing 
}: TextPreviewEditorProps) {
  const { isArabic } = useLanguage();
  const [editedText, setEditedText] = useState(text);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "split">("preview");

  const wordCount = editedText.split(/\s+/).filter(w => w.length > 1).length;
  const charCount = editedText.length;
  const pageCount = editedText.split(/---\s*Page\s*\d+\s*---/gi).length - 1 || 
                   editedText.split(/---\s*صفحة\s*\d+\s*---/gi).length - 1 || 1;

  const handleConfirm = () => {
    onConfirm(editedText);
  };

  const handleReset = () => {
    setEditedText(text);
    setIsEditing(false);
  };

  return (
    <Card className="glass-card animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {isArabic ? "معاينة النص المستخرج" : "Extracted Text Preview"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <FileText className="w-3 h-3" />
              {fileName || "Document"}
            </Badge>
            <Badge variant="outline">{pageCount} {isArabic ? "صفحة" : "pages"}</Badge>
            <Badge variant="outline">{wordCount.toLocaleString()} {isArabic ? "كلمة" : "words"}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "preview" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("preview")}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              {isArabic ? "معاينة" : "Preview"}
            </Button>
            <Button
              variant={viewMode === "split" ? "default" : "outline"}
              size="sm"
              onClick={() => { setViewMode("split"); setIsEditing(true); }}
              className="gap-2"
            >
              <Split className="w-4 h-4" />
              {isArabic ? "تحرير ومعاينة" : "Edit & Preview"}
            </Button>
          </div>
          {editedText !== text && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
              {isArabic ? "استعادة الأصلي" : "Reset to Original"}
            </Button>
          )}
        </div>

        {/* Content Area */}
        {viewMode === "preview" ? (
          <div className="relative">
            <ScrollArea className="h-[400px] border rounded-lg bg-muted/30 p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono text-foreground" dir="auto">
                {editedText}
              </pre>
            </ScrollArea>
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 gap-2"
              onClick={() => { setIsEditing(true); setViewMode("split"); }}
            >
              <Edit3 className="w-4 h-4" />
              {isArabic ? "تحرير" : "Edit"}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {isArabic ? "تحرير النص" : "Edit Text"}
              </div>
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="h-[380px] font-mono text-sm resize-none"
                dir="auto"
                placeholder={isArabic ? "الصق أو حرر النص هنا..." : "Paste or edit text here..."}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {isArabic ? "المعاينة" : "Preview"}
              </div>
              <ScrollArea className="h-[380px] border rounded-lg bg-muted/30 p-3">
                <pre className="whitespace-pre-wrap text-sm font-mono text-foreground" dir="auto">
                  {editedText}
                </pre>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Stats & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{charCount.toLocaleString()} {isArabic ? "حرف" : "characters"}</span>
            {editedText !== text && (
              <Badge variant="secondary" className="text-warning">
                {isArabic ? "تم التعديل" : "Modified"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              <X className="w-4 h-4 mr-2" />
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleConfirm} disabled={isProcessing || editedText.length < 50} className="gap-2">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isArabic ? "جاري التحليل..." : "Analyzing..."}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isArabic ? "تأكيد وتحليل" : "Confirm & Analyze"}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
