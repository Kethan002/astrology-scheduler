import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

import { 
  CalendarDays, 
  MapPin, 
  Clock, 
  AlertCircle, 
  FileText, 
  Calendar,
  Ban
} from "lucide-react";

export default function MyAppointments() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(null);

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    refetchInterval: 5000, // refetch every 5 seconds
    refetchIntervalInBackground: true, // even when tab is inactive
  });
  
  
  // Fetch user's appointments
  const { data: originalAppointments = [], isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
  
  // Process appointments to automatically mark appointments as processing or completed
  const [appointments, setAppointments] = useState([]);
  
  useEffect(() => {
    if (originalAppointments.length > 0) {
      const currentDate = new Date();
      
      const processedAppointments = originalAppointments.map((appointment) => {
        const updatedAppointment = { ...appointment };
        const appointmentDate = new Date(updatedAppointment.date);
        const appointmentDayEnd = new Date(appointmentDate);
        appointmentDayEnd.setHours(19, 0, 0, 0); // 7 PM
  
        // If appointment is confirmed and current time is past 7 PM on appointment day
        if (updatedAppointment.status === "confirmed" && currentDate > appointmentDayEnd) {
          updatedAppointment.status = "completed";
          updateAppointmentStatus(updatedAppointment.id, "completed");
        }
        // If appointment is confirmed and current time is past appointment start time but before 7 PM
        else if (updatedAppointment.status === "confirmed" && currentDate >= appointmentDate && currentDate < appointmentDayEnd) {
          updatedAppointment.status = "processing";
          updateAppointmentStatus(updatedAppointment.id, "processing");
        }
        
        return updatedAppointment;
      });
      
      setAppointments(processedAppointments);
    }
  }, [originalAppointments]);
  
  // Update appointment status in the backend
  const updateAppointmentStatus = async (id, status) => {
    try {
      await apiRequest("PATCH", `/api/appointments/${id}`, { status });
      // Silently update without notifications to avoid spamming the user
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    } catch (error) {
      console.error("Failed to update appointment status:", error);
    }
  };
  
  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/appointments/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been successfully cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setAppointmentToCancel(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Confirm cancellation
  const confirmCancellation = (id: number) => {
    setAppointmentToCancel(id);
  };
  
  // Handle cancel action
  const handleCancel = () => {
    if (appointmentToCancel) {
      cancelAppointmentMutation.mutate(appointmentToCancel);
    }
  };
  
  // Group appointments by status
  const upcomingAppointments = appointments.filter((app: any) => app.status === "confirmed");
  const currentAppointments = appointments.filter((app: any) => app.status === "processing");
  const pastAppointments = appointments.filter((app: any) => ["completed", "cancelled"].includes(app.status));

  if (user?.blockedUntil && new Date(user.blockedUntil) > new Date()) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Ban className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">
          Account Blocked / ఖాతా నిరోధించబడింది
        </h2>
        <p className="text-gray-600 mb-4">
          Your account has been blocked until next month due to missed appointment. 
          Please contact support for resolution. 
          <br></br>హాజరు కాకపోవడం వలన మీ ఖాతా తదుపరి నెల వరకు నిరోధించబడింది. పరిష్కారం కోసం సపోర్ట్‌ని సంప్రదించండి.
        </p>
        <Button
          onClick={() => {
            const message = `Hello, my account has been blocked. I apologize for not attending the session at the scheduled time. Kindly guide me on how to resolve this.\n\nనమస్తే, నా ఖాతా నిరోధించబడింది. నేను నిర్ణయించిన సమయంలో హాజరు కాలేకపోయినందుకు క్షమించండి. దయచేసి సమస్య పరిష్కరించడానికి నాకు సహాయం చేయండి.`;
            const encodedMessage = encodeURIComponent(message);
            const whatsappLink = `https://wa.me/919494276797?text=${encodedMessage}`;
            window.open(whatsappLink, "_blank");
          }}
        >
          Contact Support / సపోర్ట్‌ని సంప్రదించండి
        </Button>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (appointments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="font-heading text-2xl font-bold text-gray-800 mb-6">My Appointments</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No Appointments Found</h3>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              You don't have any appointments scheduled. Book your first astrology consultation now!
            </p>
            <Button onClick={() => window.location.href = "/"}>
              Book an Appointment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="font-heading text-2xl font-bold text-gray-800 mb-6">My Appointments</h2>
      
      {/* Upcoming appointments */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
          <Calendar className="h-5 w-5 mr-2 text-primary" />
          Upcoming Appointments
        </h3>
        
        {upcomingAppointments.length > 0 ? (
          <div className="grid gap-4">
            {upcomingAppointments.map((appointment: any) => {
              const appointmentDate = new Date(appointment.date);
              const endTime = new Date(appointment.endTime);
              
              return (
                <Card key={appointment.id} className="overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-light to-primary py-1"></div>
                  <CardContent className="p-0">
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                        <div>
                          <h4 className="text-lg font-medium">Astrology Consultation</h4>
                          <p className="text-gray-500"></p>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Upcoming
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start">
                          <CalendarDays className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Date</p>
                            <p className="text-gray-600">{formatDate(appointmentDate)}</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <Clock className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Time</p>
                            <p className="text-gray-600">{formatTime(appointmentDate)} - {formatTime(endTime)}</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <FileText className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Appointment ID</p>
                            <p className="text-gray-600">#{`AST-${appointmentDate.toISOString().slice(0, 10).replace(/-/g, '')}-${appointmentDate.getHours()}${appointmentDate.getMinutes() || '00'}`}</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <MapPin className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Location</p>
                            <a 
                              href="https://maps.app.goo.gl/o59eNF8yui2m4jcm8" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Get Directions
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 px-4 sm:px-6 py-3 bg-gray-50 flex flex-wrap gap-3 justify-end">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => confirmCancellation(appointment.id)}
                      >
                        Cancel Appointment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-gray-500">
              You don't have any upcoming appointments
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* In Progress appointments */}
      {currentAppointments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
            <Clock className="h-5 w-5 mr-2 text-amber-500" />
            In Progress Appointments
          </h3>
          
          <div className="grid gap-4">
            {currentAppointments.map((appointment: any) => {
              const appointmentDate = new Date(appointment.date);
              const endTime = new Date(appointment.endTime);
              
              return (
                <Card key={appointment.id} className="overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-300 to-amber-500 py-1"></div>
                  <CardContent className="p-0">
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                        <div>
                          <h4 className="text-lg font-medium">Astrology Consultation</h4>
                          <p className="text-gray-500"></p>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            In Progress
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start">
                          <CalendarDays className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Date</p>
                            <p className="text-gray-600">{formatDate(appointmentDate)}</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <Clock className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Time</p>
                            <p className="text-gray-600">{formatTime(appointmentDate)} - {formatTime(endTime)}</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <FileText className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Appointment ID</p>
                            <p className="text-gray-600">#{`AST-${appointmentDate.toISOString().slice(0, 10).replace(/-/g, '')}-${appointmentDate.getHours()}${appointmentDate.getMinutes() || '00'}`}</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <MapPin className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Location</p>
                            <a 
                              href="https://maps.app.goo.gl/o59eNF8yui2m4jcm8" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Get Directions
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Past appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
            <Clock className="h-5 w-5 mr-2 text-gray-500" />
            Past Appointments
          </h3>
          
          <div className="grid gap-4">
            {pastAppointments.map((appointment: any) => {
              const appointmentDate = new Date(appointment.date);
              const endTime = new Date(appointment.endTime);
              const isCompleted = appointment.status === "completed";
              
              return (
                <Card key={appointment.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                      <div>
                        <h4 className="text-lg font-medium">Astrology Consultation</h4>
                        <p className="text-gray-500">15 minutes with Dr. Stella Cosmos</p>
                      </div>
                      <div className="mt-2 sm:mt-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isCompleted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isCompleted ? 'Completed' : 'Cancelled'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start">
                        <CalendarDays className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Date</p>
                          <p className="text-gray-600">{formatDate(appointmentDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Clock className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Time</p>
                          <p className="text-gray-600">{formatTime(appointmentDate)} - {formatTime(endTime)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {isCompleted && (
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => window.location.href = "/"}>Book Again</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Cancel appointment confirmation dialog */}
      <AlertDialog open={appointmentToCancel !== null} onOpenChange={(open) => !open && setAppointmentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              Cancel Appointment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-500 hover:bg-red-600">
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}