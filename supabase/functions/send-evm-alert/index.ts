import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EVMAlertRequest {
  email: string;
  projectName: string;
  alerts: {
    type: "critical" | "warning" | "info";
    message: string;
    metric: string;
    value: number;
  }[];
  evmMetrics: {
    spi: number;
    cpi: number;
    vac: number;
    eac: number;
    bac: number;
  };
  currency?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, projectName, alerts, evmMetrics, currency = "SAR" }: EVMAlertRequest = await req.json();

    if (!email || !alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, alerts" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format currency
    const formatCurrency = (value: number) => {
      if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M ${currency}`;
      }
      if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(0)}K ${currency}`;
      }
      return `${value.toFixed(0)} ${currency}`;
    };

    // Generate alert HTML
    const alertsHtml = alerts.map(alert => {
      const bgColor = alert.type === "critical" ? "#fee2e2" : 
                      alert.type === "warning" ? "#fef3c7" : "#dbeafe";
      const textColor = alert.type === "critical" ? "#dc2626" : 
                        alert.type === "warning" ? "#d97706" : "#2563eb";
      const icon = alert.type === "critical" ? "🚨" : 
                   alert.type === "warning" ? "⚠️" : "ℹ️";
      
      return `
        <tr>
          <td style="padding: 12px; background-color: ${bgColor}; border-radius: 8px; margin-bottom: 8px;">
            <span style="font-size: 20px; margin-left: 8px;">${icon}</span>
            <span style="color: ${textColor}; font-weight: 500;">${alert.message}</span>
            <span style="background: ${textColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">${alert.metric}</span>
          </td>
        </tr>
        <tr><td style="height: 8px;"></td></tr>
      `;
    }).join("");

    // Calculate status colors
    const spiColor = evmMetrics.spi >= 1 ? "#16a34a" : evmMetrics.spi >= 0.9 ? "#d97706" : "#dc2626";
    const cpiColor = evmMetrics.cpi >= 1 ? "#16a34a" : evmMetrics.cpi >= 0.9 ? "#d97706" : "#dc2626";

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">تنبيهات مؤشرات EVM</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">EVM Performance Alerts</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 18px;">
                📊 مشروع: ${projectName}
              </h2>
              <p style="color: #6b7280; margin: 0 0 20px 0;">
                تم رصد ${alerts.length} تنبيه(ات) تتطلب انتباهك
              </p>
              
              <!-- Alerts Section -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${alertsHtml}
              </table>
              
              <!-- EVM Metrics Summary -->
              <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 12px;">
                <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">ملخص مؤشرات الأداء</h3>
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="50%" style="padding: 10px;">
                      <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="font-size: 12px; color: #6b7280;">SPI (أداء الجدول)</div>
                        <div style="font-size: 28px; font-weight: bold; color: ${spiColor};">${evmMetrics.spi.toFixed(2)}</div>
                      </div>
                    </td>
                    <td width="50%" style="padding: 10px;">
                      <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="font-size: 12px; color: #6b7280;">CPI (أداء التكلفة)</div>
                        <div style="font-size: 28px; font-weight: bold; color: ${cpiColor};">${evmMetrics.cpi.toFixed(2)}</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="padding: 10px;">
                      <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="font-size: 12px; color: #6b7280;">BAC (الميزانية)</div>
                        <div style="font-size: 18px; font-weight: bold; color: #374151;">${formatCurrency(evmMetrics.bac)}</div>
                      </div>
                    </td>
                    <td width="50%" style="padding: 10px;">
                      <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="font-size: 12px; color: #6b7280;">EAC (التكلفة المتوقعة)</div>
                        <div style="font-size: 18px; font-weight: bold; color: #374151;">${formatCurrency(evmMetrics.eac)}</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding: 10px;">
                      <div style="text-align: center; padding: 15px; background: ${evmMetrics.vac >= 0 ? '#dcfce7' : '#fee2e2'}; border-radius: 8px;">
                        <div style="font-size: 12px; color: #6b7280;">VAC (الفرق المتوقع)</div>
                        <div style="font-size: 22px; font-weight: bold; color: ${evmMetrics.vac >= 0 ? '#16a34a' : '#dc2626'};">
                          ${evmMetrics.vac >= 0 ? '+' : ''}${formatCurrency(evmMetrics.vac)}
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  تم إرسال هذا التنبيه من نظام تحليل جداول الكميات
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
                  This alert was sent from BOQ Analysis System
                </p>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    console.log(`Sending EVM alert email to ${email} for project ${projectName}`);
    console.log(`Alerts count: ${alerts.length}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BOQ Analysis <onboarding@resend.dev>",
        to: [email],
        subject: `🚨 تنبيهات EVM - ${projectName} | ${alerts.length} تنبيه(ات)`,
        html: emailHtml,
      }),
    });

    const emailResponse = await res.json();
    
    if (!res.ok) {
      throw new Error(emailResponse.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-evm-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
