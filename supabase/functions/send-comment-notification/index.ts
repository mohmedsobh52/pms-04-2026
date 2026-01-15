import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

interface CommentNotificationRequest {
  shareCode: string;
  commenterName: string;
  commentText: string;
  itemId?: string;
  creatorEmail?: string;
  analysisTitle?: string;
}

// HTML escape function to prevent XSS/HTML injection
function escapeHtml(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Input validation constants
const MAX_COMMENTER_NAME_LENGTH = 100;
const MAX_COMMENT_TEXT_LENGTH = 2000;
const MAX_ITEM_ID_LENGTH = 100;
const MAX_ANALYSIS_TITLE_LENGTH = 200;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const { userId, error: authError } = await verifyAuth(req);
  if (authError) {
    return authError;
  }
  console.log(`Authenticated user: ${userId}`);

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured - skipping email notification");
      return new Response(
        JSON.stringify({ 
          success: false, 
          skipped: true,
          message: "Email notifications not configured. Add RESEND_API_KEY to enable." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      shareCode, 
      commenterName, 
      commentText, 
      itemId,
      creatorEmail,
      analysisTitle 
    }: CommentNotificationRequest = await req.json();

    if (!shareCode || !commenterName || !commentText) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: shareCode, commenterName, commentText" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input length validation
    if (commenterName.length > MAX_COMMENTER_NAME_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Commenter name too long (max ${MAX_COMMENTER_NAME_LENGTH} characters)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (commentText.length > MAX_COMMENT_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Comment text too long (max ${MAX_COMMENT_TEXT_LENGTH} characters)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (itemId && itemId.length > MAX_ITEM_ID_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Item ID too long (max ${MAX_ITEM_ID_LENGTH} characters)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (analysisTitle && analysisTitle.length > MAX_ANALYSIS_TITLE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Analysis title too long (max ${MAX_ANALYSIS_TITLE_LENGTH} characters)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no creator email provided, we can't send notification
    if (!creatorEmail) {
      console.log("No creator email provided - cannot send notification");
      return new Response(
        JSON.stringify({ 
          success: false, 
          skipped: true,
          message: "No creator email available" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Escape all user inputs before embedding in HTML
    const safeCommenterName = escapeHtml(commenterName);
    const safeCommentText = escapeHtml(commentText);
    const safeItemId = escapeHtml(itemId || '');
    const safeAnalysisTitle = escapeHtml(analysisTitle || shareCode);
    const safeShareCode = escapeHtml(shareCode);

    // Build the share link
    const shareLink = `https://brbgdvesterjvwduvsrf.lovable.app/shared/${encodeURIComponent(shareCode)}`;
    const itemInfo = safeItemId ? `<p><strong>البند المرتبط:</strong> ${safeItemId}</p>` : '';

    // Send email using Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BOQ Analyzer <notifications@resend.dev>",
        to: [creatorEmail],
        subject: `💬 تعليق جديد على التحليل: ${safeAnalysisTitle}`,
        html: `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <style>
              body { 
                font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
                line-height: 1.6;
                color: #333;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 2px solid #e0e0e0;
                margin-bottom: 20px;
              }
              .header h1 {
                color: #2563eb;
                margin: 0;
                font-size: 24px;
              }
              .comment-box {
                background-color: #f8fafc;
                border-right: 4px solid #2563eb;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .comment-author {
                font-weight: bold;
                color: #1e40af;
                margin-bottom: 10px;
              }
              .comment-text {
                color: #374151;
                font-size: 16px;
              }
              .button {
                display: inline-block;
                background-color: #2563eb;
                color: white !important;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin-top: 20px;
              }
              .footer {
                text-align: center;
                color: #6b7280;
                font-size: 12px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 BOQ Analyzer</h1>
              </div>
              
              <p>مرحباً،</p>
              <p>تم إضافة تعليق جديد على التحليل المشترك الخاص بك.</p>
              
              <div class="comment-box">
                <div class="comment-author">👤 ${safeCommenterName}</div>
                <div class="comment-text">${safeCommentText}</div>
                ${itemInfo}
              </div>
              
              <p style="text-align: center;">
                <a href="${shareLink}" class="button">عرض التحليل والرد</a>
              </p>
              
              <div class="footer">
                <p>تم إرسال هذا البريد تلقائياً من نظام BOQ Analyzer</p>
                <p>رمز المشاركة: ${safeShareCode}</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", emailResponse.status, errorData);
      throw new Error(`Failed to send email: ${emailResponse.status}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending comment notification:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to send notification",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
