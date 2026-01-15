import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Verify the JWT token from the Authorization header and return the user ID.
 * Uses getUser() which is more reliable than getClaims() for token validation.
 * Returns null if the token is invalid or missing.
 */
export async function verifyAuth(req: Request): Promise<{ userId: string | null; error: Response | null }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('Missing or invalid authorization header');
    return {
      userId: null,
      error: new Response(
        JSON.stringify({ 
          error: 'Unauthorized - Missing or invalid authorization header',
          errorAr: 'غير مصرح - رأس التفويض مفقود أو غير صالح'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    return {
      userId: null,
      error: new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  try {
    // Use getUser() which validates the token server-side
    // This is more reliable than getClaims() which only decodes the JWT
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      console.error('Auth verification failed:', userError?.message || 'No user data');
      
      // Provide a more helpful error message
      let errorMessage = 'Unauthorized - Invalid token';
      let errorMessageAr = 'غير مصرح - الرمز غير صالح';
      
      if (userError?.message?.includes('expired')) {
        errorMessage = 'Session expired - Please login again';
        errorMessageAr = 'انتهت الجلسة - يرجى تسجيل الدخول مرة أخرى';
      } else if (userError?.message?.includes('refresh')) {
        errorMessage = 'Session needs refresh - Please reload the page';
        errorMessageAr = 'الجلسة تحتاج تحديث - يرجى إعادة تحميل الصفحة';
      }
      
      return {
        userId: null,
        error: new Response(
          JSON.stringify({ 
            error: errorMessage,
            errorAr: errorMessageAr,
            code: 'AUTH_FAILED'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      };
    }

    console.log(`User authenticated: ${userData.user.id}`);
    return { userId: userData.user.id, error: null };
    
  } catch (err) {
    console.error('Auth exception:', err);
    return {
      userId: null,
      error: new Response(
        JSON.stringify({ 
          error: 'Authentication error',
          errorAr: 'خطأ في المصادقة'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }
}
