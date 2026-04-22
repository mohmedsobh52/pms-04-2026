import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { SuspenseFallback } from "@/components/ui/loading-states";
import { PMSLogo } from "@/components/PMSLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة. إذا لم يكن لديك حساب، يرجى إنشاء حساب جديد.");
        } else if (error.message.includes("User already registered")) {
          setError("هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول.");
        } else if (error.message.includes("Email not confirmed")) {
          setError("يرجى تأكيد البريد الإلكتروني أولاً");
        } else if (error.message.includes("Email rate limit exceeded")) {
          setError("تم تجاوز الحد الأقصى من المحاولات. يرجى الانتظار قليلاً والمحاولة مرة أخرى.");
        } else {
          setError(error.message);
        }
        return;
      }

      if (!isLogin) {
        toast({
          title: "تم إنشاء الحساب بنجاح",
          description: "تم تسجيل دخولك تلقائياً",
        });
      } else {
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "مرحباً بك في نظام PMS",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return <SuspenseFallback fullPage size="lg" />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <PMSLogo size="lg" />
            <div>
              <h1 className="font-display text-2xl font-bold gradient-text">PMS</h1>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-center mb-2">
            {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </h2>

          {/* Info Message */}
          {isLogin ? (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center text-sm text-blue-600 dark:text-blue-400">
              ليس لديك حساب؟{" "}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="font-semibold underline hover:text-blue-700 dark:hover:text-blue-300"
              >
                أنشئ حساباً جديداً هنا
              </button>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center text-sm text-green-600 dark:text-green-400">
              سجل حسابك الآن! التسجيل سريع ولا يحتاج إلى تأكيد البريد الإلكتروني
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {isLogin && error.includes("غير صحيحة") && (
                <div className="mt-2 pt-2 border-t border-destructive/20">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setError(null);
                    }}
                    className="text-xs hover:underline font-medium"
                  >
                    انقر هنا لإنشاء حساب جديد ←
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full btn-gradient"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                "تسجيل الدخول"
              ) : (
                "إنشاء حساب"
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
            </span>{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "إنشاء حساب" : "تسجيل الدخول"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
