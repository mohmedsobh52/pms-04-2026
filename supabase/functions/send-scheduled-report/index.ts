import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledReportRequest {
  report_id?: string;
  recipient_emails: string[];
  report_name: string;
  report_type: string;
  project_name?: string;
  report_data: any;
  include_charts?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      report_id,
      recipient_emails, 
      report_name, 
      report_type,
      project_name,
      report_data,
      include_charts
    }: ScheduledReportRequest = await req.json();

    if (!recipient_emails || recipient_emails.length === 0) {
      throw new Error('No recipient emails provided');
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    console.log(`Sending scheduled report: ${report_name} to ${recipient_emails.length} recipients`);

    // Format the report data into HTML
    const formatReportHTML = () => {
      let html = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">${report_name}</h1>
            ${project_name ? `<p style="margin: 10px 0 0; opacity: 0.9;">Project: ${project_name}</p>` : ''}
            <p style="margin: 5px 0 0; opacity: 0.8;">Report Type: ${report_type}</p>
            <p style="margin: 5px 0 0; opacity: 0.8;">Generated: ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
      `;

      // Summary section
      if (report_data?.summary) {
        html += `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Summary</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
              ${report_data.summary.total_items ? `<div><strong>Total Items:</strong> ${report_data.summary.total_items}</div>` : ''}
              ${report_data.summary.total_value ? `<div><strong>Total Value:</strong> ${report_data.summary.total_value.toLocaleString()} ${report_data.summary.currency || 'SAR'}</div>` : ''}
              ${report_data.summary.categories ? `<div><strong>Categories:</strong> ${report_data.summary.categories.length}</div>` : ''}
              ${report_data.summary.analyzed_files ? `<div><strong>Analyzed Files:</strong> ${report_data.summary.analyzed_files}</div>` : ''}
            </div>
          </div>
        `;
      }

      // Items table
      if (report_data?.items && report_data.items.length > 0) {
        html += `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Items (Top 20)</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #667eea; color: white;">
                  <th style="padding: 12px; text-align: left;">#</th>
                  <th style="padding: 12px; text-align: left;">Description</th>
                  <th style="padding: 12px; text-align: right;">Qty</th>
                  <th style="padding: 12px; text-align: left;">Unit</th>
                  <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${report_data.items.slice(0, 20).map((item: any, index: number) => `
                  <tr style="border-bottom: 1px solid #e9ecef; ${index % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                    <td style="padding: 10px;">${item.item_number || index + 1}</td>
                    <td style="padding: 10px;">${item.description || '-'}</td>
                    <td style="padding: 10px; text-align: right;">${item.quantity || '-'}</td>
                    <td style="padding: 10px;">${item.unit || '-'}</td>
                    <td style="padding: 10px; text-align: right;">${item.total_price?.toLocaleString() || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${report_data.items.length > 20 ? `<p style="color: #666; font-style: italic; margin-top: 10px;">Showing 20 of ${report_data.items.length} items</p>` : ''}
          </div>
        `;
      }

      // Recommendations
      if (report_data?.recommendations && report_data.recommendations.length > 0) {
        html += `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Recommendations</h2>
            <ul style="padding-left: 20px; margin: 0;">
              ${report_data.recommendations.map((rec: string) => `<li style="margin-bottom: 8px; color: #555;">${rec}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      html += `
          </div>
          
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>This is an automated report from BOQ Analysis Platform</p>
            <p>© ${new Date().getFullYear()} All rights reserved</p>
          </div>
        </div>
      `;

      return html;
    };

    // Send email using Resend API
    const sendEmail = async (email: string) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'BOQ Reports <onboarding@resend.dev>',
          to: [email],
          subject: `📊 ${report_name} - ${report_type} Report`,
          html: formatReportHTML(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send email: ${errorText}`);
      }

      return response.json();
    };

    // Send email to all recipients
    const results = await Promise.allSettled(
      recipient_emails.map(email => sendEmail(email))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Email results: ${successful} sent, ${failed} failed`);

    // Update last_sent_at if report_id provided
    if (report_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('scheduled_reports')
        .update({ 
          last_sent_at: new Date().toISOString()
        })
        .eq('id', report_id);
    }

    return new Response(JSON.stringify({ 
      success: true,
      sent: successful,
      failed: failed,
      message: `Report sent to ${successful} recipients`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-scheduled-report function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
