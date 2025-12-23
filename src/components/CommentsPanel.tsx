import { useState, useEffect } from "react";
import { MessageSquare, X, Send, Reply, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  share_code: string;
  author_name: string;
  author_email?: string;
  item_id?: string;
  comment_text: string;
  comment_type: string;
  is_resolved: boolean;
  parent_id?: string;
  created_at: string;
}

interface CommentsPanelProps {
  shareCode: string;
  items?: { item_number: string; description: string }[];
}

export function CommentsPanel({ shareCode, items = [] }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState(() => {
    return localStorage.getItem('commentAuthorName') || '';
  });
  const [commentText, setCommentText] = useState('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Fetch comments
  useEffect(() => {
    if (!shareCode) return;

    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('analysis_comments')
          .select('*')
          .eq('share_code', shareCode)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setComments(data || []);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`comments-${shareCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_comments',
          filter: `share_code=eq.${shareCode}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setComments(prev => [...prev, payload.new as Comment]);
            if (payload.new.author_name !== authorName) {
              toast({
                title: "New Comment",
                description: `${payload.new.author_name} added a comment`,
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setComments(prev => prev.map(c => c.id === payload.new.id ? payload.new as Comment : c));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareCode, authorName, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authorName.trim() || !commentText.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name and comment",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save author name for future
      localStorage.setItem('commentAuthorName', authorName);

      const { error } = await supabase
        .from('analysis_comments')
        .insert({
          share_code: shareCode,
          author_name: authorName.trim(),
          comment_text: commentText.trim(),
          item_id: selectedItem || null,
          comment_type: selectedItem ? 'item' : 'general',
          parent_id: replyingTo || null,
        });

      if (error) throw error;

      setCommentText('');
      setSelectedItem('');
      setReplyingTo(null);
      
      toast({
        title: "Comment Added",
        description: "Your comment has been posted",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsResolved = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('analysis_comments')
        .update({ is_resolved: true })
        .eq('id', commentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  // Group comments by parent
  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const commentCount = comments.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-6 gap-2 shadow-lg z-50"
        >
          <MessageSquare className="w-4 h-4" />
          Comments
          {commentCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {commentCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments ({commentCount})
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to leave feedback!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topLevelComments.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <div className={`p-3 rounded-lg border ${comment.is_resolved ? 'bg-muted/50 opacity-75' : 'bg-card'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{comment.author_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {comment.item_id && (
                          <Badge variant="outline" className="text-xs">
                            #{comment.item_id}
                          </Badge>
                        )}
                        {comment.is_resolved && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{comment.comment_text}</p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setReplyingTo(comment.id)}
                      >
                        <Reply className="w-3 h-3 mr-1" />
                        Reply
                      </Button>
                      {!comment.is_resolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => markAsResolved(comment.id)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Replies */}
                  {getReplies(comment.id).map((reply) => (
                    <div key={reply.id} className="ml-4 p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{reply.author_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm">{reply.comment_text}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Comment Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t pt-4">
          {replyingTo && (
            <div className="flex items-center justify-between bg-muted p-2 rounded text-sm">
              <span>Replying to comment...</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <Input
            placeholder="Your name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="text-sm"
          />

          {items.length > 0 && !replyingTo && (
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">General comment</option>
              {items.slice(0, 20).map((item) => (
                <option key={item.item_number} value={item.item_number}>
                  {item.item_number}: {item.description.slice(0, 30)}...
                </option>
              ))}
            </select>
          )}

          <Textarea
            placeholder="Write your comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="text-sm resize-none"
            rows={3}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Post Comment
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
