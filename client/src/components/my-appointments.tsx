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
import { useState } from "react";
import { CalendarDays, MapPin, Clock, AlertCircle, FileText, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export default function MyAppointments() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(null);
  
  // Fetch user's appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["/api/appointments"],
  });
  
  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/appointments/${id}`, { status: "cancelled" });
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
  
  // View appointment details
  const viewAppointment = (id: number) => {
    navigate(`/confirmation?id=${id}`);
  };
  
  // Group appointments by status
  const upcomingAppointments = appointments.filter((app: any) => app.status === "confirmed");
  const pastAppointments = appointments.filter((app: any) => ["completed", "cancelled"].includes(app.status));
  
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
            <Button onClick={() => navigate("/")}>
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
                          <p className="text-gray-500">15 minutes with Dr. Stella Cosmos</p>
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
                            <p className="text-gray-600">Astro Consultation Center</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 px-4 sm:px-6 py-3 bg-gray-50 flex flex-wrap gap-3 justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewAppointment(appointment.id)}
                      >
                        View Details
                      </Button>
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
                        <Button variant="outline" size="sm">Book Again</Button>
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
