import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { authAPI } from "@/lib/api";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    try {
      setLoading(true);
      await authAPI.requestPasswordReset(email);
      toast.success("OTP sent to your email");
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !password || !confirmPassword) {
      toast.error("Please fill all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await authAPI.resetPassword(email, otp, password);
      toast.success("Password updated successfully");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
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
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Forgot Password</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {step === 1 ? "Enter your email to receive an OTP" : "Enter OTP and set a new password"}
                </p>
              </div>

              {step === 1 && (
                <form onSubmit={handleSendOTP} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="bg-background border-border text-foreground"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full btn-primary py-6 text-lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <Input
                      type="email"
                      value={email}
                      disabled
                      className="bg-muted border-border text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">OTP</label>
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter OTP"
                      className="bg-background border-border text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="bg-background border-border text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="bg-background border-border text-foreground"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full btn-primary py-6 text-lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </form>
              )}

              <p className="text-center text-sm text-muted-foreground mt-6">
                Back to{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ForgotPassword;
