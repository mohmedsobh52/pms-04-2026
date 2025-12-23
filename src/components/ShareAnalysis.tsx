import { useState, useEffect } from "react";
import { Share2, Copy, Check, Users, Link2, Loader2, Eye, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ShareAnalysisProps {
  analysisData: any;
  wbsData?: any;
  fileName?: string;
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function ShareAnalysis({ analysisData, wbsData, fileName }: ShareAnalysisProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const { toast } = useToast();

  // Subscribe to realtime updates for viewer count
  useEffect(() => {
    if (!shareCode) return;

    const channel = supabase
      .channel(`share-${shareCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shared_analyses',
          filter: `share_code=eq.${shareCode}`
        },
        (payload: any) => {
          if (payload.new?.viewer_count !== undefined) {
            setViewerCount(payload.new.viewer_count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareCode]);

  const handleShare = async () => {
    if (!analysisData) {
      toast({
        title: "No data to share",
        description: "Please analyze a BOQ first",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);

    try {
      const code = generateShareCode();
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      const { data, error } = await supabase
        .from('shared_analyses')
        .insert({
          share_code: code,
          analysis_data: analysisData,
          wbs_data: wbsData || null,
          file_name: fileName || null,
          expires_at: expires.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/shared/${code}`;
      setShareLink(link);
      setShareCode(code);
      setExpiresAt(expires);
      setViewerCount(0);

      toast({
        title: "Analysis shared!",
        description: "Share link created successfully",
      });
    } catch (error: any) {
      console.error("Error sharing analysis:", error);
      toast({
        title: "Sharing failed",
        description: error.message || "Failed to create share link",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link copied!",
        description: "Share link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAccess = async () => {
    if (!shareCode) return;

    try {
      const { error } = await supabase
        .from('shared_analyses')
        .update({ is_active: false })
        .eq('share_code', shareCode);

      if (error) throw error;

      setShareLink("");
      setShareCode("");
      setExpiresAt(null);
      setViewerCount(0);

      toast({
        title: "Access revoked",
        description: "Share link has been deactivated",
      });
    } catch (error: any) {
      console.error("Error revoking access:", error);
      toast({
        title: "Revoke failed",
        description: error.message || "Failed to revoke access",
        variant: "destructive",
      });
    }
  };

  const daysUntilExpiry = expiresAt 
    ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={!analysisData}>
          <Share2 className="w-4 h-4" />
          Share Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share BOQ Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!shareLink ? (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Link2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Create Shareable Link</h3>
                <p className="text-sm text-muted-foreground">
                  Generate a view-only link that allows others to see your BOQ analysis.
                  Link expires after 7 days.
                </p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>Viewers can see all analysis data</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Link expires automatically after 7 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Track how many people are viewing</span>
                </div>
              </div>

              <Button 
                onClick={handleShare} 
                disabled={isSharing}
                className="w-full gap-2"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating link...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Create Share Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Share link input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Share Link</label>
                <div className="flex gap-2">
                  <Input 
                    value={shareLink} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-semibold">{viewerCount}</span> viewers
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Expires in <span className="font-semibold">{daysUntilExpiry}</span> days
                  </span>
                </div>
              </div>

              {/* View Only Badge */}
              <div className="flex items-center justify-center">
                <Badge variant="secondary" className="gap-1">
                  <Eye className="w-3 h-3" />
                  View Only Mode
                </Badge>
              </div>

              {/* Revoke button */}
              <Button 
                variant="destructive" 
                onClick={handleRevokeAccess}
                className="w-full gap-2"
              >
                <X className="w-4 h-4" />
                Revoke Access
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
