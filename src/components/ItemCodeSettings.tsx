import { useState } from "react";
import { Settings, Download, Hash, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CodeFormat, CodeFormatConfig } from "@/hooks/useItemCodes";

interface ItemCodeSettingsProps {
  codeFormat: CodeFormat;
  customConfig: CodeFormatConfig;
  onUpdateFormat: (format: CodeFormat) => void;
  onUpdateCustomConfig: (config: Partial<CodeFormatConfig>) => void;
  availableFormats: Array<{ value: CodeFormat; label: string; example: string }>;
  onExportToExcel: () => void;
  itemCount: number;
}

export function ItemCodeSettings({
  codeFormat,
  customConfig,
  onUpdateFormat,
  onUpdateCustomConfig,
  availableFormats,
  onExportToExcel,
  itemCount,
}: ItemCodeSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Hash className="w-4 h-4" />
          Item Codes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Item Code Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Format Preview */}
          <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Current Format</span>
              <Badge variant="secondary" className="font-mono">
                {availableFormats.find(f => f.value === codeFormat)?.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Example: {availableFormats.find(f => f.value === codeFormat)?.example}
            </p>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Select Code Format</Label>
            <Select value={codeFormat} onValueChange={(v) => onUpdateFormat(v as CodeFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFormats.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{format.label}</span>
                      {codeFormat === format.value && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Format Settings */}
          {codeFormat === 'CUSTOM' && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">Custom Format Options</Label>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Prefix</Label>
                  <Input
                    value={customConfig.prefix}
                    onChange={(e) => onUpdateCustomConfig({ prefix: e.target.value.toUpperCase() })}
                    placeholder="CODE"
                    className="font-mono text-sm"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Separator</Label>
                  <Select
                    value={customConfig.separator}
                    onValueChange={(v) => onUpdateCustomConfig({ separator: v })}
                  >
                    <SelectTrigger className="font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">- (Dash)</SelectItem>
                      <SelectItem value=".">. (Dot)</SelectItem>
                      <SelectItem value="_">_ (Underscore)</SelectItem>
                      <SelectItem value="/">/  (Slash)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Digits</Label>
                  <Select
                    value={customConfig.digits.toString()}
                    onValueChange={(v) => onUpdateCustomConfig({ digits: parseInt(v) })}
                  >
                    <SelectTrigger className="font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 (01)</SelectItem>
                      <SelectItem value="3">3 (001)</SelectItem>
                      <SelectItem value="4">4 (0001)</SelectItem>
                      <SelectItem value="5">5 (00001)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Preview: <span className="font-mono font-medium text-foreground">
                  {customConfig.prefix}{customConfig.separator}{'0'.repeat(customConfig.digits - 1)}1
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Export Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Item Codes</Label>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">{itemCount} items</p>
                <p className="text-xs text-muted-foreground">Export all codes to Excel</p>
              </div>
              <Button variant="default" size="sm" onClick={onExportToExcel} className="gap-2">
                <Download className="w-4 h-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
