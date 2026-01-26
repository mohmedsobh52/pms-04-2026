import { Settings, Save, X, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectData, EditFormData, currencies, projectTypes } from "./types";

interface ProjectSettingsTabProps {
  project: ProjectData;
  editForm: EditFormData;
  isEditing: boolean;
  isSaving: boolean;
  isArabic: boolean;
  onEditFormChange: (form: EditFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  formatDate: (dateString: string) => string;
}

export function ProjectSettingsTab({
  project,
  editForm,
  isEditing,
  isSaving,
  isArabic,
  onEditFormChange,
  onSave,
  onCancel,
  onStartEdit,
  formatDate,
}: ProjectSettingsTabProps) {
  const updateField = (field: keyof EditFormData, value: string) => {
    onEditFormChange({ ...editForm, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {isArabic ? "إعدادات المشروع" : "Project Settings"}
          </CardTitle>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
              <Button 
                onClick={onSave}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isArabic ? "حفظ" : "Save"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={onStartEdit} className="gap-2">
              <Settings className="w-4 h-4" />
              {isArabic ? "تعديل" : "Edit"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Project Name and Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {isArabic ? "اسم المشروع" : "Project Name"} *
            </Label>
            {isEditing ? (
              <Input 
                id="name"
                value={editForm.name} 
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={isArabic ? "أدخل اسم المشروع" : "Enter project name"}
              />
            ) : (
              <Input value={editForm.name} readOnly className="bg-muted/50" />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">
              {isArabic ? "العملة" : "Currency"}
            </Label>
            {isEditing ? (
              <Select
                value={editForm.currency}
                onValueChange={(val) => updateField('currency', val)}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder={isArabic ? "اختر العملة" : "Select currency"} />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(curr => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input 
                value={currencies.find(c => c.value === editForm.currency)?.label || editForm.currency} 
                readOnly 
                className="bg-muted/50" 
              />
            )}
          </div>
        </div>

        {/* Project Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="projectType">
              {isArabic ? "نوع المشروع" : "Project Type"}
            </Label>
            {isEditing ? (
              <Select
                value={editForm.project_type}
                onValueChange={(val) => updateField('project_type', val)}
              >
                <SelectTrigger id="projectType">
                  <SelectValue placeholder={isArabic ? "اختر النوع" : "Select type"} />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {isArabic ? type.label.ar : type.label.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input 
                value={projectTypes.find(t => t.value === editForm.project_type)?.label[isArabic ? 'ar' : 'en'] || editForm.project_type} 
                readOnly 
                className="bg-muted/50" 
              />
            )}
          </div>

          {/* Project Status */}
          <div className="space-y-2">
            <Label htmlFor="status">
              {isArabic ? "حالة المشروع" : "Project Status"}
            </Label>
            {isEditing ? (
              <Select
                value={editForm.status}
                onValueChange={(val) => updateField('status', val)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder={isArabic ? "اختر الحالة" : "Select status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      {isArabic ? "مسودة" : "Draft"}
                    </div>
                  </SelectItem>
                  <SelectItem value="in_progress">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {isArabic ? "قيد التنفيذ" : "In Progress"}
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {isArabic ? "مكتمل" : "Completed"}
                    </div>
                  </SelectItem>
                  <SelectItem value="suspended">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      {isArabic ? "معلق" : "Suspended"}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                <span className={`w-2 h-2 rounded-full ${
                  editForm.status === 'draft' ? 'bg-gray-500' :
                  editForm.status === 'in_progress' ? 'bg-blue-500' :
                  editForm.status === 'completed' ? 'bg-green-500' :
                  'bg-yellow-500'
                }`} />
                <span>
                  {editForm.status === 'draft' ? (isArabic ? "مسودة" : "Draft") :
                   editForm.status === 'in_progress' ? (isArabic ? "قيد التنفيذ" : "In Progress") :
                   editForm.status === 'completed' ? (isArabic ? "مكتمل" : "Completed") :
                   (isArabic ? "معلق" : "Suspended")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">
            {isArabic ? "وصف المشروع" : "Project Description"}
          </Label>
          {isEditing ? (
            <Textarea 
              id="description"
              value={editForm.description} 
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={isArabic ? "أدخل وصف المشروع" : "Enter project description"}
              rows={3}
            />
          ) : (
            <Textarea 
              value={editForm.description || (isArabic ? "لا يوجد وصف" : "No description")} 
              readOnly 
              className="bg-muted/50 resize-none" 
              rows={3}
            />
          )}
        </div>

        {/* Location and Client */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">
              {isArabic ? "موقع المشروع" : "Project Location"}
            </Label>
            {isEditing ? (
              <Input 
                id="location"
                value={editForm.location} 
                onChange={(e) => updateField('location', e.target.value)}
                placeholder={isArabic ? "أدخل موقع المشروع" : "Enter project location"}
              />
            ) : (
              <Input 
                value={editForm.location || (isArabic ? "غير محدد" : "Not specified")} 
                readOnly 
                className="bg-muted/50" 
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">
              {isArabic ? "اسم العميل" : "Client Name"}
            </Label>
            {isEditing ? (
              <Input 
                id="clientName"
                value={editForm.client_name} 
                onChange={(e) => updateField('client_name', e.target.value)}
                placeholder={isArabic ? "أدخل اسم العميل" : "Enter client name"}
              />
            ) : (
              <Input 
                value={editForm.client_name || (isArabic ? "غير محدد" : "Not specified")} 
                readOnly 
                className="bg-muted/50" 
              />
            )}
          </div>
        </div>
        
        {/* Last Updated - Read Only */}
        <div className="space-y-2">
          <Label>
            {isArabic ? "آخر تحديث" : "Last Updated"}
          </Label>
          <Input value={formatDate(project.updated_at)} readOnly className="bg-muted/50" />
        </div>
        
        {/* Delete Project */}
        <div className="pt-4 border-t">
          <Button variant="destructive" className="gap-2">
            <Trash2 className="w-4 h-4" />
            {isArabic ? "حذف المشروع" : "Delete Project"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
