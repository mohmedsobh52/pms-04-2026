import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Eye, Clock, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnalysisResults } from "@/components/AnalysisResults";
import { CommentsPanel } from "@/components/CommentsPanel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SharedAnalysis {
  id: string;
  share_code: string;
  analysis_data: any;
  wbs_data: any;
  file_name: string | null;
  created_at: string;
  expires_at: string;
  viewer_count: number;
  is_active: boolean;
  created_by: string | null;
}

export default function SharedView() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharedData, setSharedData] = useState<SharedAnalysis | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!shareCode) {
      setError("Invalid share link");
      setLoading(false);
      return;
    }

    fetchSharedAnalysis();
  }, [shareCode]);

  const fetchSharedAnalysis = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('shared_analyses')
        .select('*')
        .eq('share_code', shareCode)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError("Share link not found or has expired");
        } else {
          throw fetchError;
        }
        return;
      }

      if (!data) {
        setError("Share link not found");
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError("This share link has expired");
        return;
      }

      // Check if active
      if (!data.is_active) {
        setError("This share link has been revoked");
        return;
      }

      setSharedData(data);

      // Increment viewer count
      await supabase
        .from('shared_analyses')
        .update({ viewer_count: (data.viewer_count || 0) + 1 })
        .eq('share_code', shareCode);

      toast({
        title: "Viewing shared analysis",
        description: data.file_name ? `File: ${data.file_name}` : "BOQ Analysis",
      });
    } catch (err: any) {
      console.error("Error fetching shared analysis:", err);
      setError(err.message || "Failed to load shared analysis");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading shared analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !sharedData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto p-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">{error || "Something went wrong"}</h1>
          <p className="text-muted-foreground">
            The share link you're trying to access is invalid, expired, or has been revoked.
          </p>
          <Link to="/">
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go to BOQ Analyzer
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const expiresDate = new Date(sharedData.expires_at);
  const daysUntilExpiry = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  BOQ Analyzer
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="font-semibold">
                  {sharedData.file_name || "Shared BOQ Analysis"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Shared on {new Date(sharedData.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="gap-1">
                <Eye className="w-3 h-3" />
                View Only
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Expires in {daysUntilExpiry} days
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <AnalysisResults 
          data={sharedData.analysis_data} 
          wbsData={sharedData.wbs_data} 
          fileName={sharedData.file_name || undefined}
        />
      </main>

      {/* Comments Panel */}
      <CommentsPanel 
        shareCode={shareCode!} 
        items={sharedData.analysis_data?.items || []}
        analysisFileName={sharedData.file_name || undefined}
      />
    </div>
  );
}
