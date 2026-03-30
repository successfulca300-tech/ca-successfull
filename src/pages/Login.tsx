import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, GraduationCap } from "lucide-react";

const attemptOptions = ["May 26", "Sept 26", "Jan 26"] as const;
const levelOptions = ["CA Inter", "CA Final"] as const;
const preparingForOptions = ["Group 1", "Group 2", "Both Groups"] as const;

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(1, "Phone number is required"),
  attempt: z.enum(attemptOptions, { message: "Please select an attempt" }),
  level: z.enum(levelOptions, { message: "Please select a level" }),
  preparingFor: z.enum(preparingForOptions, { message: "Please select what you are preparing for" }),
  address: z.string().min(5, "Address is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    attempt: "",
    level: "",
    preparingFor: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn } = useAuth();

  // Check if signup tab is requested from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'signup') {
      setIsLogin(false);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isLogin) {
        const result = loginSchema.safeParse({
          email: formData.email,
          password: formData.password,
        });

        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        // Use AuthContext signIn so UI updates without refresh and navigation happens
        const { error } = await signIn(formData.email, formData.password);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Logged in successfully!",
        });
      } else {
        const result = signupSchema.safeParse({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          attempt: formData.attempt as (typeof attemptOptions)[number],
          level: formData.level as (typeof levelOptions)[number],
          preparingFor: formData.preparingFor as (typeof preparingForOptions)[number],
          address: formData.address,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });

        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        // Call registration API directly (don't auto-login for OTP verification)
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          attempt: formData.attempt,
          level: formData.level,
          preparingFor: formData.preparingFor,
          address: formData.address,
          password: formData.password,
        }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        toast({
          title: "Success",
          description: "Account created successfully! Please check your email for OTP verification.",
        });

        // Redirect to OTP verification page
        navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="py-16 bg-secondary/30 min-h-[70vh] flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-card p-8 rounded-xl shadow-lg border border-border">
              {/* Logo/Brand */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <GraduationCap className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Welcome to CA Successful</h1>
                <p className="text-muted-foreground text-sm mt-1">Your journey to success starts here</p>
              </div>

              {/* Tabs */}
              <div className="flex mb-8 border-b border-border">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 pb-4 text-lg font-semibold transition-colors ${
                    isLogin ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 pb-4 text-lg font-semibold transition-colors ${
                    !isLogin ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Full Name *</label>
                    <Input 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      className="bg-background border-border text-foreground"
                      required 
                    />
                    {errors.name && (
                      <p className="text-destructive text-sm mt-1">{errors.name}</p>
                    )}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="bg-background border-border text-foreground"
                    required
                  />
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Mobile Number *</label>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter your mobile number"
                      className="bg-background border-border text-foreground"
                      required
                    />
                    {errors.phone && (
                      <p className="text-destructive text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Attempt *</label>
                    <select
                      name="attempt"
                      value={formData.attempt}
                      onChange={handleChange}
                      className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Select your attempt</option>
                      {attemptOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.attempt && (
                      <p className="text-destructive text-sm mt-1">{errors.attempt}</p>
                    )}
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Level *</label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleChange}
                      className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Select your level</option>
                      {levelOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.level && (
                      <p className="text-destructive text-sm mt-1">{errors.level}</p>
                    )}
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Preparing For *</label>
                    <select
                      name="preparingFor"
                      value={formData.preparingFor}
                      onChange={handleChange}
                      className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Select group preference</option>
                      {preparingForOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.preparingFor && (
                      <p className="text-destructive text-sm mt-1">{errors.preparingFor}</p>
                    )}
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Address *</label>
                    <Textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter your address"
                      className="bg-background border-border text-foreground min-h-[96px]"
                      required
                    />
                    {errors.address && (
                      <p className="text-destructive text-sm mt-1">{errors.address}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Password *</label>
                  <Input 
                    type="password" 
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="bg-background border-border text-foreground"
                    required 
                  />
                  {errors.password && (
                    <p className="text-destructive text-sm mt-1">{errors.password}</p>
                  )}
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Confirm Password *</label>
                    <Input 
                      type="password" 
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="bg-background border-border text-foreground"
                      required 
                    />
                    {errors.confirmPassword && (
                      <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>
                )}

                {isLogin && (
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full btn-primary py-6 text-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLogin ? "Logging in..." : "Creating account..."}
                    </>
                  ) : (
                    isLogin ? "Login" : "Create Account"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary font-medium hover:underline"
                >
                  {isLogin ? "Sign Up" : "Login"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Login;
