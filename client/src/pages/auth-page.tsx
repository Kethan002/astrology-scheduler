import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema, loginUserSchema } from "@shared/schema";
import { Moon, User, Phone, Home, Mail, Eye, EyeOff } from "lucide-react";
import { Redirect } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const RegisterSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6),
  otp: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const OTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits")
});

// Updated schema for email check
const ForgotPasswordEmailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }),
  otp: z.string().optional(),
});

// Schema for forgot password OTP
const ForgotPasswordOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits")
});

// Schema for password reset
const ForgotPasswordResetSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof RegisterSchema>;
type LoginFormValues = z.infer<typeof loginUserSchema>;
type OTPFormValues = z.infer<typeof OTPSchema>;
type ForgotPasswordEmailFormValues = z.infer<typeof ForgotPasswordEmailSchema>;
type ForgotPasswordOTPFormValues = z.infer<typeof ForgotPasswordOTPSchema>;
type ForgotPasswordResetFormValues = z.infer<typeof ForgotPasswordResetSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"email" | "otp" | "reset">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [forgotPasswordOtpCountdown, setForgotPasswordOtpCountdown] = useState(0);
  const forgotPasswordOtpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [usernameExistsError, setUsernameExistsError] = useState("");
  const [emailExistsError, setEmailExistsError] = useState(""); 
  const [registrationError, setRegistrationError] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const otpTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  
  const { user, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "", 
      address: "",
      password: "",
      confirmPassword: "",
      otp: "",
    },
  });

  const otpForm = useForm<OTPFormValues>({
    resolver: zodResolver(OTPSchema),
    defaultValues: {
      email: "",
      otp: "",
    },
  });

  const forgotPasswordEmailForm = useForm<ForgotPasswordEmailFormValues>({
    resolver: zodResolver(ForgotPasswordEmailSchema),
    defaultValues: {
      email: "",
      otp: "",
    },
  });
  
  const forgotPasswordOTPForm = useForm<ForgotPasswordOTPFormValues>({
    resolver: zodResolver(ForgotPasswordOTPSchema),
    defaultValues: {
      email: "",
      otp: "",
    },
  });

  const forgotPasswordResetForm = useForm<ForgotPasswordResetFormValues>({
    resolver: zodResolver(ForgotPasswordResetSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    setLoginError("");
    loginMutation.mutate(data, {
      onError: (error) => {
        console.error("Login error:", error);
        setLoginError("Invalid Username or password");
      }
    });
  };

  const sendOTP = async (email: string) => {
     try {
        // First check if email exists
        const checkResponse = await fetch("/api/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        
        const checkResult = await checkResponse.json();
        
        if (checkResult.exists) {
          // Email already exists, show error
          setEmailExistsError("Email already exists. Please use another email or try to login.");
          return;
        }
        
        // Continue with normal OTP sending if email doesn't exist
        setEmailExistsError(""); // Clear any previous error
    
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error("Failed to send OTP");
      }

      setOtpSent(true);
      setOtpCountdown(180); // 3 minutes countdown

      // Start countdown timer
      if (otpTimerRef.current) {
        clearInterval(otpTimerRef.current);
      }
      
      otpTimerRef.current = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            if (otpTimerRef.current) clearInterval(otpTimerRef.current);
            setOtpSent(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("OTP sending error:", error);
      setRegistrationError("Failed to send OTP. Please try again.");
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });

      const result = await response.json();

      if (result.valid) {
        setEmailVerified(true);
        if (otpTimerRef.current) clearInterval(otpTimerRef.current);
        return true;
      } else {
        setRegistrationError("Invalid OTP. Please try again.");
        return false;
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setRegistrationError("OTP verification failed. Please try again.");
      return false;
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    // Clear all previous error messages
    setUsernameExistsError("");
    setEmailExistsError("");
    setRegistrationError("");
    
    if (!emailVerified) {
      setRegistrationError("Please verify your email first.");
      return;
    }

    try {
      const { confirmPassword, otp, ...registerData } = data;
      
      const completeRegisterData = {
        ...registerData,
        mobile: "", // Send empty string as mobile is not collected
      };
      
      registerMutation.mutate(completeRegisterData, {
        onSuccess: () => {
          console.log("Registration successful");
        },
        onError: (error: any) => {
          const errorData = error.response?.data || {};
          const errorMessage = errorData.message || error.message || "Registration failed";
          
          if (errorMessage.toLowerCase().includes("username")) {
            setUsernameExistsError("Username already exists. Please choose another username.");
          } 
          else if (errorMessage.toLowerCase().includes("email")) {
            setEmailExistsError("Email already exists. Please use another email or try to login.");
          }
          else {
            setRegistrationError("Username or Email already exists.");
          }
        }
      });
    } catch (err) {
      console.error("Exception in registration submission:", err);
      setRegistrationError("An unexpected error occurred. Please try again.");
    }
  };

  const sendForgotPasswordOTP = async (email: string) => {
    setForgotPasswordError("");
    try {
      const response = await fetch("/api/send-forgot-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error("Failed to send OTP");
      }

      const result = await response.json();
      setEmailExists(result.exists);

      if (result.exists) {
        setForgotPasswordStep("otp");
        forgotPasswordOTPForm.setValue("email", email);
        setForgotPasswordOtpCountdown(180); // 3 minutes countdown

        if (forgotPasswordOtpTimerRef.current) {
          clearInterval(forgotPasswordOtpTimerRef.current);
        }

        forgotPasswordOtpTimerRef.current = setInterval(() => {
          setForgotPasswordOtpCountdown((prev) => {
            if (prev <= 1) {
              if (forgotPasswordOtpTimerRef.current) clearInterval(forgotPasswordOtpTimerRef.current);
              setForgotPasswordStep("email");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setForgotPasswordError("Email not found. Please check and try again.");
      }
    } catch (error) {
      console.error("Forgot password OTP error:", error);
      setForgotPasswordError("Failed to send verification code. Please try again.");
      setEmailExists(false);
    }
  };

  const verifyForgotPasswordOTP = async (email: string, otp: string) => {
    setForgotPasswordError("");
    try {
      const response = await fetch("/api/verify-forgot-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });

      const result = await response.json();

      if (result.valid) {
        if (forgotPasswordOtpTimerRef.current) clearInterval(forgotPasswordOtpTimerRef.current);
        setForgotPasswordStep("reset");
        setResetEmail(email);
        return true;
      } else {
        setForgotPasswordError("Invalid verification code. Please try again.");
        return false;
      }
    } catch (error) {
      console.error("Forgot password OTP verification error:", error);
      setForgotPasswordError("Verification failed. Please try again.");
      return false;
    }
  };

  const onForgotPasswordResetSubmit = async (data: ForgotPasswordResetFormValues) => {
    setForgotPasswordError("");
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          newPassword: data.password
        })
      });

      if (!response.ok) {
        throw new Error("Password reset failed");
      }

      setPasswordResetSuccess(true);
      
      setTimeout(() => {
        setForgotPasswordOpen(false);
        setForgotPasswordStep("email");
        setPasswordResetSuccess(false);
        forgotPasswordEmailForm.reset();
        forgotPasswordOTPForm.reset();
        forgotPasswordResetForm.reset();
        
        // Set focus to username field after closing dialog
        setTimeout(() => {
          const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement;
          if (usernameInput) usernameInput.focus();
        }, 100);
      }, 2000);
    } catch (error) {
      console.error("Reset error:", error);
      setForgotPasswordError("Failed to reset password. Please try again.");
    }
  };

  const onForgotPasswordEmailSubmit = async (data: ForgotPasswordEmailFormValues, event: React.FormEvent) => {
    // Important: Prevent default form submission behavior
    event.preventDefault();
    
    try {
      // Send OTP for forgot password
      await sendForgotPasswordOTP(data.email);
    } catch (error) {
      console.error("Forgot Password OTP error:", error);
    }
  };
  
  const onForgotPasswordOTPSubmit = async (data: ForgotPasswordOTPFormValues, event: React.FormEvent) => {
    // Important: Prevent default form submission behavior
    event.preventDefault();
    
    try {
      await verifyForgotPasswordOTP(data.email, data.otp);
    } catch (error) {
      console.error("Forgot Password OTP verification error:", error);
    }
  };

  const handleForgotPasswordDialogChange = (open: boolean) => {
    setForgotPasswordOpen(open);
    if (!open) {
      setForgotPasswordStep("email");
      setForgotPasswordError("");
      forgotPasswordEmailForm.reset();
      forgotPasswordOTPForm.reset();
      forgotPasswordResetForm.reset();
      
      if (forgotPasswordOtpTimerRef.current) {
        clearInterval(forgotPasswordOtpTimerRef.current);
      }
    }
  };

  const handleForgotPasswordClick = (e: React.MouseEvent) => {
    // Prevent any default behavior or event bubbling
    e.preventDefault();
    e.stopPropagation();
    
    const currentUsername = loginForm.getValues("username");
    if (currentUsername && currentUsername.includes('@')) {
      forgotPasswordEmailForm.setValue("email", currentUsername);
    } else {
      forgotPasswordEmailForm.reset();
    }
    setForgotPasswordOpen(true);
  };

  const handleTabChange = (value: string) => {
    setLoginError("");
    setUsernameExistsError("");
    setEmailExistsError("");
    setRegistrationError("");
    setActiveTab(value as "login" | "register");
  };

  useEffect(() => {
    return () => {
      // Clean up timers on component unmount
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
      if (forgotPasswordOtpTimerRef.current) clearInterval(forgotPasswordOtpTimerRef.current);
    };
  }, []);

  if (user) {
    if (user.isAdmin) {
      return <Redirect to="/admin" />;
    }
    return <Redirect to="/" />;
  }

  return (
    <div 
      className="min-h-screen flex flex-col bg-no-repeat bg-center"
      style={{ 
        backgroundImage: "url('https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      {/* Overlay to darken the background image slightly without blurring */}
      <div className="absolute inset-0 bg-black/10 z-0"></div>
      
      <div className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center relative z-10">
        <Card className="w-full max-w-2xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
          <div className="grid grid-cols-1">
            <div className="p-6 md:p-8">
              <div className="flex items-center space-x-2 mb-6">
                <Moon className="h-6 w-6 text-yellow-300" />
                <h1 className="font-heading font-bold text-2xl text-white">Astro Appointments</h1>
              </div>

              <Tabs value={activeTab} onValueChange={handleTabChange} className="text-white">
                <TabsList className="grid grid-cols-2 mb-6 bg-white/20">
                  <TabsTrigger value="login" className="text-white data-[state=active]:bg-[#3D5DAB]/100 data-[state=active]:text-white">Sign In</TabsTrigger>
                  <TabsTrigger value="register" className="text-white data-[state=active]:bg-[#3D5DAB]/100 data-[state=active]:text-white">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      {loginError && (
                        <div className="bg-red-400/20 text-white p-3 rounded-md text-sm backdrop-blur-sm border border-red-500/30">
                          {loginError}
                        </div>
                      )}
                      
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-2.5 h-5 w-5 text-white/70" />
                                <Input 
                                  className="pl-10 bg-white/10 border-white/20 text-[#0A1A38]/100 placeholder:text-white/50 focus:border-white/40"
                                  placeholder="Enter your username" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-200" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showLoginPassword ? "text" : "password"} 
                                  placeholder="Enter your password" 
                                  className="pr-10 bg-white/10 border-white/20 text-[#0A1A38]/100 placeholder:text-white/50 focus:border-white/40"
                                  {...field} 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-white/70"
                                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                                >
                                  {showLoginPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                  ) : (
                                    <Eye className="h-5 w-5" />
                                  )}
                                  <span className="sr-only">
                                    {showLoginPassword ? "Hide password" : "Show password"}
                                  </span>
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-200" />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="remember" className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                          <Label htmlFor="remember" className="text-sm text-white">Remember me</Label>
                        </div>
                        <Dialog open={forgotPasswordOpen} onOpenChange={handleForgotPasswordDialogChange}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="link" 
                              className="p-0 h-auto text-sm text-white/90 hover:text-white" 
                              type="button" 
                              onClick={handleForgotPasswordClick}
                            >
                              Forgot password?
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px] bg-slate-900/95 border border-white/20 text-white backdrop-blur-lg">
                            <DialogHeader>
                              <DialogTitle>Reset Password</DialogTitle>
                              <DialogDescription className="text-white/70">
                                {forgotPasswordStep === "email" 
                                  ? "Enter your email to reset your password."
                                  : forgotPasswordStep === "otp"
                                  ? "Enter the verification code sent to your email."
                                  : "Create a new password for your account."}
                              </DialogDescription>
                            </DialogHeader>
                            
                            {forgotPasswordError && (
                              <div className="bg-red-400/20 text-red-100 p-3 rounded-md text-sm backdrop-blur-sm border border-red-500/30 mb-4">
                                {forgotPasswordError}
                              </div>
                            )}
                            
                            {forgotPasswordStep === "email" && (
                              <div>
                                <form 
                                  onSubmit={(e) => {
                                    const formData = forgotPasswordEmailForm.getValues();
                                    onForgotPasswordEmailSubmit(formData, e);
                                  }}
                                >
                                  <FormField
                                    control={forgotPasswordEmailForm.control}
                                    name="email"
                                    render={({ field }) => (
                                      <FormItem className="mb-4">
                                        <FormLabel className="text-white">Email</FormLabel>
                                        <FormControl>
                                          <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-white/70" />
                                            <Input 
                                              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40" 
                                              placeholder="Enter your email" 
                                              {...field} 
                                            />
                                          </div>
                                        </FormControl>
                                        <FormMessage className="text-red-200" />
                                      </FormItem>
                                    )}
                                  />
                                  <DialogFooter className="mt-4">
                                    <Button 
                                      type="button"
                                      onClick={() => {
                                        const email = forgotPasswordEmailForm.getValues("email");
                                        if (email) {
                                          sendForgotPasswordOTP(email);
                                        }
                                      }}
                                      className="bg-primary hover:bg-primary/90"
                                    >
                                      Send Verification Code
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </div>
                            )}
                            
                            {forgotPasswordStep === "otp" && (
                              <div>
                                <form 
                                  onSubmit={(e) => {
                                    const formData = forgotPasswordOTPForm.getValues();
                                    onForgotPasswordOTPSubmit(formData, e);
                                  }}
                                >
                                  <div className="mb-4 bg-blue-900/30 text-blue-200 p-3 rounded-md border border-blue-500/30">
                                    Verification code sent to: <strong>{forgotPasswordOTPForm.getValues("email")}</strong>
                                  </div>
                                  
                                  <FormField
                                    control={forgotPasswordOTPForm.control}
                                    name="otp"
                                    render={({ field }) => (
                                      <FormItem className="mb-4">
                                        <FormLabel className="text-white">Verification Code</FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="text"
                                            placeholder="Enter 6-digit code" 
                                            maxLength={6}
                                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                                            {...field}
                                            onChange={(e) => {
                                              const value = e.target.value.replace(/\D/g, '');
                                              field.onChange(value);
                                            }} 
                                          />
                                        </FormControl>
                                        <FormMessage className="text-red-200" />
                                        {forgotPasswordOtpCountdown > 0 && (
                                          <p className="text-sm text-white/70 mt-1">
                                            Code expires in: {Math.floor(forgotPasswordOtpCountdown / 60)}:{(forgotPasswordOtpCountdown % 60).toString().padStart(2, '0')}
                                          </p>
                                        )}
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <DialogFooter className="mt-4 gap-2">
                                    <Button 
                                      type="button"
                                      onClick={() => {
                                        setForgotPasswordStep("email");
                                        if (forgotPasswordOtpTimerRef.current) {
                                          clearInterval(forgotPasswordOtpTimerRef.current);
                                        }
                                      }}
                                      className="bg-primary/20 hover:bg-primary/30 text-white border border-primary/30"
                                    >
                                      Back
                                    </Button>
                                    <Button 
                                      type="submit" 
                                      className="bg-primary/20 hover:bg-primary/30 text-Black border border-primary/30"
                                    >
                                      Verify Code
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="link"
                                      onClick={() => {
                                        const email = forgotPasswordOTPForm.getValues("email");
                                        if (email) {
                                          sendForgotPasswordOTP(email);
                                        }
                                      }}
                                      disabled={forgotPasswordOtpCountdown > 0}
                                      className="text-sm text-white/90 hover:text-white ml-auto"
                                    >
                                      {forgotPasswordOtpCountdown > 0 
                                        ? `Resend in ${forgotPasswordOtpCountdown}s` 
                                        : "Resend Code"}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </div>
                            )}
                            
                            {forgotPasswordStep === "reset" && !passwordResetSuccess && (
                              <Form {...forgotPasswordResetForm}>
                                <form onSubmit={forgotPasswordResetForm.handleSubmit(onForgotPasswordResetSubmit)}>
                                  <div className="mb-4 bg-blue-900/30 text-blue-200 p-3 rounded-md border border-blue-500/30">
                                    Creating new password for: <strong>{resetEmail}</strong>
                                  </div>
                                  
                                  <FormField
                                    control={forgotPasswordResetForm.control}
                                    name="password"
                                    render={({ field }) => (
                                      <FormItem className="mb-4">
                                        <FormLabel className="text-white">New Password</FormLabel>
                                        <FormControl>
                                          <div className="relative">
                                            <Input 
                                              type={showResetPassword ? "text" : "password"}
                                              placeholder="Enter new password" 
                                              className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                                              {...field} 
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-white/70"
                                              onClick={() => setShowResetPassword(!showResetPassword)}
                                            >
                                              {showResetPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                              ) : (
                                                <Eye className="h-5 w-5" />
                                              )}
                                              <span className="sr-only">
                                                {showResetPassword ? "Hide password" : "Show password"}
                                              </span>
                                            </Button>
                                          </div>
                                        </FormControl>
                                        <FormMessage className="text-red-200" />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={forgotPasswordResetForm.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                      <FormItem className="mb-4">
                                        <FormLabel className="text-white">Confirm Password</FormLabel>
                                        <FormControl>
                                          <div className="relative">
                                            <Input 
                                              type={showResetConfirmPassword ? "text" : "password"}
                                              placeholder="Confirm new password" 
                                              className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                                              {...field} 
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-white/70"
                                              onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                                            >
                                              {showResetConfirmPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                              ) : (
                                                <Eye className="h-5 w-5" />
                                              )}
                                              <span className="sr-only">
                                                {showResetConfirmPassword ? "Hide password" : "Show password"}
                                              </span>
                                            </Button>
                                          </div>
                                        </FormControl>
                                        <FormMessage className="text-red-200" />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <DialogFooter className="mt-4 gap-2">
                                    <Button 
                                      type="button"
                                      onClick={() => setForgotPasswordStep("otp")}
                                      className="bg-primary/20 hover:bg-primary/30 text-white border border-primary/30"
                                    >
                                      Back
                                    </Button>
                                    <Button 
                                      type="submit" 
                                      className="bg-primary hover:bg-primary/90"
                                    >
                                      Reset Password
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </Form>
                            )}
                            
                            {passwordResetSuccess && (
                              <div className="py-6 text-center">
                                <div className="mb-4 bg-green-900/30 text-green-200 p-3 rounded-md border border-green-500/30">
                                  Password reset successful!
                                </div>
                                <p className="text-sm text-white/70">
                                  You can now login with your new password.
                                </p>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-[#3D5DAB]/100 hover:bg-[#3D5DAB]/120 text-white" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      {/* Display general registration error at top of form if present */}
                      {registrationError && (
                        <div className="bg-red-400/20 text-red-100 p-3 rounded-md text-sm backdrop-blur-sm border border-red-500/30">
                          {registrationError}
                        </div>
                      )}
                      
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-2.5 h-5 w-5 text-white/70" />
                                <Input 
                                  className="pl-10 bg-white/10 border-white/20 text-[#0A1A38]/100 placeholder:text-white/50 focus:border-white/40" 
                                  placeholder="Choose a username" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-200" />
                            {/* Display username exists error */}
                            {usernameExistsError && (
                              <p className="text-sm text-red-300 mt-1">
                                {usernameExistsError}
                              </p>
                            )}
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Full Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-2.5 h-5 w-5 text-white/70" />
                                <Input 
                                  className="pl-10 bg-white/10 border-white/20 text-[#0A1A38]/100 placeholder:text-white/50 focus:border-white/40" 
                                  placeholder="Your full name" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-200" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Email</FormLabel>
                            <FormControl>
                              <div className="relative flex items-center space-x-2">
                                <div className="flex-grow">
                                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-white/70" />
                                  <Input 
                                    type="email" 
                                    className="pl-10 bg-white/10 border-white/20 text-[#0A1A38]/100 placeholder:text-white/50 focus:border-white/40" 
                                    placeholder="your@email.com" 
                                    {...field} 
                                    disabled={emailVerified}
                                  />
                                </div>
                                {!emailVerified ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent event propagation
                                      sendOTP(field.value);
                                    }}
                                    disabled={otpSent}
                                    className="shrink-0 bg-[#3D5DAB]/100 hover:bg-[#3D5DAB]/120 text-white"
                                  >
                                    {otpSent ? `Resend in ${otpCountdown}s` : "Verify"}
                                  </Button>
                                ) : (
                                  <div className="text-green-500 font-bold text-2xl">✓</div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-200" />
                            {/* Display email exists error */}
                            {emailExistsError && (
                              <p className="text-sm text-red-400 mt-1">
                                {emailExistsError}
                              </p>
                            )}
                            {otpSent && !emailVerified && (
                              <div className="mt-2">
                                <FormField
                                  name="otp"
                                  control={otpForm.control}
                                  render={({ field: otpField }) => (
                                    <FormItem>
                                      <FormLabel className="text-white">Enter OTP</FormLabel>
                                      <FormControl>
                                        <div className="flex items-center space-x-2">
                                          <Input
                                            type="text"
                                            placeholder="Enter 6-digit OTP"
                                            maxLength={6}
                                            className="bg-white/10 border-white/20 text-[#0A1A38]/100 placeholder:text-Blac focus:border-white/40"
                                            {...otpField}
                                            onChange={(e) => {
                                              const value = e.target.value.replace(/\D/g, '');
                                              otpField.onChange(value);
                                              
                                              // Auto-verify if 6 digits are entered
                                              if (value.length === 6) {
                                                verifyOTP(registerForm.getValues('email'), value)
                                                  .then((verified) => {
                                                    if (verified) {
                                                      registerForm.setValue('otp', value);
                                                    }
                                                  });
                                              }
                                            }}
                                          />
                                          <Button
                                            type="button"
                                            variant="outline"
                                            className="shrink-0 bg-[#3D5DAB]/100 hover:bg-[#3D5DAB]/120 text-white"
                                            onClick={() => {
                                              e.stopPropagation();
                                              const email = registerForm.getValues('email');
                                              const otp = otpField.value;
                                              verifyOTP(email, otp);
                                            }}
                                          >
                                            Verify
                                          </Button>
                                        </div>
                                      </FormControl>
                                      <FormMessage className="text-red-200" />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Home className="absolute left-3 top-2.5 h-5 w-5 text-white/70" />
                                <Input 
                                  className="pl-10 bg-white/10 border-white/20 text-[#0A1A38]/100 placeholder:text-white/50 focus:border-white/40" 
                                  placeholder="Your address" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-200" />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showRegisterPassword ? "text" : "password"} 
                                    placeholder="Create a password" 
                                    className="pr-10 bg-white/10 border-white/20 text-[#0A1A38]/100 placeholder:text-white/50 focus:border-white/40"
                                    {...field} 
                                  />
                                 <Button 
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-white/70"
                                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                  >
                                    {showRegisterPassword ? (
                                      <EyeOff className="h-5 w-5" />
                                    ) : (
                                      <Eye className="h-5 w-5" />
                                    )}
                                    <span className="sr-only">
                                      {showRegisterPassword ? "Hide password" : "Show password"}
                                    </span>
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-200" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Confirm Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showRegisterConfirmPassword ? "text" : "password"} 
                                    placeholder="Confirm your password" 
                                    className="pr-10 bg-white/10 border-white/20 text-[#0A1A38]/100 placeholder:text-white/50 focus:border-white/40"
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-white/70"
                                    onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                                  >
                                    {showRegisterConfirmPassword ? (
                                      <EyeOff className="h-5 w-5" />
                                    ) : (
                                      <Eye className="h-5 w-5" />
                                    )}
                                    <span className="sr-only">
                                      {showRegisterConfirmPassword ? "Hide password" : "Show password"}
                                    </span>
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-200" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-[#3D5DAB]/100 hover:bg-[#3D5DAB]/120 text-white"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Side - Hero 
            <div className="hidden md:block bg-gradient-to-br from-primary to-navyblue-200 p-8 text-white">
              <div className="h-full flex flex-col justify-center">
                <div className="flex items-center mb-6">
                  <div className="bg-white/20 p-3 rounded-full">
                    <Moon className="h-8 w-8 text-yellow-300" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold font-heading mb-4">Discover Your Cosmic Path</h2>
                <p className="text-white/80 mb-6">
                  Book personalized astrology consultations with expert astrologers. 
                  Gain insights into your future, relationships, career, and more.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-yellow-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Personal horoscope readings</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-yellow-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Compatibility analysis</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-yellow-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Career guidance based on your natal chart</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-yellow-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Life path readings and future predictions</span>
                  </li>
                </ul>
              </div>
            </div>*/}
          </div>
        </Card>
      </div>
    </div>
  );
}