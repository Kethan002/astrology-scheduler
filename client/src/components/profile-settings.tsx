import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { User as UserIcon, Settings as SettingsIcon, HelpCircle, Shield, Trash2 } from "lucide-react";

// Profile update schema
const profileUpdateSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileUpdateSchema>;

// Password update schema
const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(6, { message: "Current password is required." }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string().min(8, { message: "Please confirm your new password." }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordUpdateSchema>;

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState<string>("profile");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Extract the section from URL if available
  const urlParams = new URLSearchParams(window.location.search);
  const sectionFromUrl = urlParams.get('section');
  
  // Set active section based on URL
  useEffect(() => {
    if (sectionFromUrl && ['profile', 'settings', 'help', 'security'].includes(sectionFromUrl)) {
      setActiveSection(sectionFromUrl);
    }
  }, [sectionFromUrl]);

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.mobile || "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      return await res.json() as User;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PATCH", "/api/user/password", data);
      return await res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/user");
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been deleted successfully.",
      });
      navigate("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle profile form submission
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Handle password form submission
  const onPasswordSubmit = (data: PasswordFormValues) => {
    updatePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  // Handle account deletion
  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
    setDeleteDialogOpen(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sidebar */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1 font-medium">
              <Button 
                variant={activeSection === "profile" ? "secondary" : "ghost"} 
                className="w-full justify-start text-left pl-4" 
                onClick={() => {
                  setActiveSection("profile");
                  navigate("/?tab=profile&section=profile");
                }}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button 
                variant={activeSection === "settings" ? "secondary" : "ghost"} 
                className="w-full justify-start text-left pl-4" 
                onClick={() => {
                  setActiveSection("settings");
                  navigate("/?tab=profile&section=settings");
                }}
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Preferences
              </Button>
              <Button 
                variant={activeSection === "security" ? "secondary" : "ghost"} 
                className="w-full justify-start text-left pl-4" 
                onClick={() => {
                  setActiveSection("security");
                  navigate("/?tab=profile&section=security");
                }}
              >
                <Shield className="h-4 w-4 mr-2" />
                Security
              </Button>
              <Button 
                variant={activeSection === "help" ? "secondary" : "ghost"} 
                className="w-full justify-start text-left pl-4" 
                onClick={() => {
                  setActiveSection("help");
                  navigate("/?tab=profile&section=help");
                }}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="md:col-span-2">
        {/* Profile section */}
        {activeSection === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Your phone number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Used for appointment reminders
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Security section */}
        {activeSection === "security" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your password must be at least 8 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending}
                    >
                      {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="border-red-100">
              <CardHeader>
                <CardTitle className="text-red-600">Delete Account</CardTitle>
                <CardDescription>
                  Once you delete your account, there is no going back. Please be certain.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Settings */}
        {activeSection === "settings" && (
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Manage your notification and language preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="notifications">
                <TabsList className="mb-4">
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="language">Language</TabsTrigger>
                </TabsList>
                <TabsContent value="notifications">
                  <div className="space-y-4">
                    <h3 className="font-medium">Coming Soon</h3>
                    <p className="text-sm text-gray-500">
                      Notification preferences will be available in a future update.
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="language">
                  <div className="space-y-4">
                    <h3 className="font-medium">Available Languages</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="justify-start">
                        <span className="mr-2">🇺🇸</span> English
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <span className="mr-2">🇮🇳</span> తెలుగు (Telugu)
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                      More language options will be available in future updates.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Help section */}
        {activeSection === "help" && (
          <Card>
            <CardHeader>
              <CardTitle>Help Center</CardTitle>
              <CardDescription>
                Find answers to common questions about using the appointment booking system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-lg mb-2">Frequently Asked Questions</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-primary">When can I book appointments?</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Bookings are open every Sunday from 8 AM to 9 AM for the upcoming week.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-primary">How many appointments can I book?</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        You can book one appointment per week.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-primary">Can I change my appointment time?</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Yes, you can cancel your current appointment and book a new one during the booking window.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-primary">What languages are supported?</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Currently, the system supports English and Telugu languages.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-lg mb-2">Contact Support</h3>
                  <p className="text-sm text-gray-600">
                    Need additional help? Contact our support team:
                  </p>
                  <div className="mt-2">
                    <p className="text-sm"><strong>Email:</strong> support@astroappointments.com</p>
                    <p className="text-sm"><strong>Phone:</strong> +1 (555) 123-4567</p>
                    <p className="text-sm"><strong>Hours:</strong> Monday-Friday, 9 AM - 5 PM</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}