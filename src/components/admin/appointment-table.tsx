import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Appointment } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime, getInitials } from "@/lib/utils";
import { 
  Filter, 
  Download, 
  MoreVertical, 
  Edit, 
  Trash2,
  AlertCircle,
  Phone,
  Ban
} from "lucide-react";
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

interface AppointmentWithUser extends Appointment {
  user?: {
    name: string;
    email: string;
    phone: string;
    address: string;
    blockedUntil?: string;
  };
}

interface AppointmentTableProps {
  // appointments: Appointment[];
}

export default function AppointmentTable(/*{ appointments }: AppointmentTableProps*/ ) {
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appointmentToDelete, setAppointmentToDelete] = useState<number | null>(null);
  
  // Define status badge colors
  const statusColors = {
    confirmed: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  
  
  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery<AppointmentWithUser[]>({
    queryKey: ["/api/admin/appointments"],
    queryFn: async () => {
      const response = await fetch("/api/admin/appointments");
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
    staleTime: 0, // Consider data stale immediately
    gcTime: 0, // Don't cache the data
  });

  useEffect(() => {
    if (appointments.length > 0) {
      const currentDate = new Date();
      
      // Find appointments that need status update
      const appointmentsToUpdate = appointments.filter(appointment => {
        const appointmentDay = new Date(appointment.date);
        appointmentDay.setHours(19, 0, 0, 0); // 7 PM of appointment day
        return appointment.status === "confirmed" && currentDate > appointmentDay;
      });
      
      // Update each appointment status if needed
      appointmentsToUpdate.forEach(appointment => {
        updateAppointmentStatus.mutate({
          id: appointment.id,
          status: "completed"
        });
      });
    }
  }, [appointments]);

  // Update the block mutation to set proper blockedUntil date
  const blockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(0);
      nextMonth.setHours(23, 59, 59, 999);
      
      await apiRequest("PATCH", `/api/users/${userId}/block`, { 
        blockedUntil: nextMonth.toISOString() 
      });
    },
    onSuccess: () => {
      // Invalidate both admin and user appointments
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "User Blocked",
        description: "User has been blocked until next month",
      });
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("PATCH", `/api/users/${userId}/block`, { 
        blockedUntil: null 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "User Unblocked",
        description: "User has been unblocked successfully.",
      });
    },
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/appointments/${id}`); // Changed endpoint
    },
    onSuccess: () => {
      toast({
        title: "Appointment Deleted",
        description: "The appointment has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      
      setAppointmentToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Filter appointments based on selected filters
  const filteredAppointments = appointments.filter((appointment) => {
    // Date filtering logic
    if (dateFilter !== "all") {
      const now = new Date();
      const appDate = new Date(appointment.date);
      
      if (dateFilter === "today") {
        return (
          appDate.getDate() === now.getDate() &&
          appDate.getMonth() === now.getMonth() &&
          appDate.getFullYear() === now.getFullYear()
        );
      } else if (dateFilter === "week") {
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return appDate >= now && appDate <= weekFromNow;
      } else if (dateFilter === "month") {
        return (
          appDate.getMonth() === now.getMonth() &&
          appDate.getFullYear() === now.getFullYear()
        );
      }
    }
    
    // Status filtering
    if (statusFilter !== "all" && appointment.status !== statusFilter) {
      return false;
    }
    
    return true;
  });
  
  // Handle delete confirmation
  const confirmDelete = (id: number) => {
    setAppointmentToDelete(id);
  };
  
  const handleDelete = () => {
    if (appointmentToDelete) {
      deleteAppointmentMutation.mutate(appointmentToDelete);
    }
  };
  
  // Update appointment status
  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PUT", `/api/appointments/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "The appointment status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  return (
    <>
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div className="flex space-x-2 mb-2 sm:mb-0">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="confirmed">Upcoming</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setDateFilter("all");
              setStatusFilter("all");
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const csv = [
                ['Appt ID', 'Client', 'Phone', 'Address', 'Date', 'Time', 'Duration', 'Status'].join(','),
                ...filteredAppointments.map(appointment => [
                  `AST-${new Date(appointment.date).toISOString().slice(0, 10).replace(/-/g, '')}-${new Date(appointment.date).getHours()}${new Date(appointment.date).getMinutes() || '00'}`,
                  appointment.user?.name || 'User',
                  appointment.user?.phone || 'N/A',
                  appointment.user?.address || 'N/A',
                  formatDate(new Date(appointment.date)),
                  `${formatTime(new Date(appointment.date))} - ${formatTime(new Date(appointment.endTime))}`,
                  '15 minutes',
                  appointment.status
                ].join(','))
              ].join('\n');
              
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.setAttribute('hidden', '');
              a.setAttribute('href', url);
              a.setAttribute('download', 'appointments.csv');
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Appt ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-lg font-bold">Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((appointment) => {
                const date = new Date(appointment.date);
                const endTime = new Date(appointment.endTime);
                
                return (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      #{`AST-${date.toISOString().slice(0, 10).replace(/-/g, '')}-${date.getHours()}${date.getMinutes() || '00'}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                          {getInitials(appointment.user?.name || "User")}
                        </div>
                        <div className="font-medium">{appointment.user?.name || "User"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {appointment.user?.phone ? (
                        <a 
                          href={`https://wa.me/91${appointment.user.mobile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          <Phone className="h-4 w-4" />
                          {appointment.user.phone}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{appointment.user?.address || "N/A"}</TableCell>
                    <TableCell>
                      <div className="text-base font-medium text-gray-800">{formatDate(date)}</div>
                      <div className="text-base text-gray-600">
                        {formatTime(date)} - {formatTime(endTime)}
                      </div>
                    </TableCell>
                    <TableCell>15 minutes</TableCell>
                    <TableCell>
                    {appointment.user?.blockedUntil && new Date(appointment.user.blockedUntil) > new Date() ? (
                        <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Blocked
                        </span>
                      ) : (
                        <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                          appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      )}
                    </TableCell>
                    
                
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              updateAppointmentStatus.mutate({
                                id: appointment.id,
                                status: "confirmed",
                              });
                            }}
                          >
                            Mark as Confirmed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              updateAppointmentStatus.mutate({
                                id: appointment.id,
                                status: "completed",
                              });
                            }}
                          >
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              updateAppointmentStatus.mutate({
                                id: appointment.id,
                                status: "cancelled",
                              });
                            }}
                          >
                            Mark as Cancelled
                          </DropdownMenuItem>
                          {appointment.user?.blockedUntil && new Date(appointment.user.blockedUntil) > new Date() ? (
                          <DropdownMenuItem
                            onClick={() => unblockUserMutation.mutate(appointment.userId)}
                            className="text-green-600"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Unblock User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => blockUserMutation.mutate(appointment.userId)}
                            className="text-red-500"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Block User
                          </DropdownMenuItem>
                        )}

                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => confirmDelete(appointment.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                          
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                  No appointments found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
        <div className="flex-1 flex sm:hidden">
          <Button variant="outline" size="sm" className="mr-2">Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">{filteredAppointments.length}</span> of{" "}
              <span className="font-medium">{appointments.length}</span> results
            </p>
          </div>
          <div className="flex space-x-1">
            <Button variant="outline" size="sm" disabled>
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm">1</Button>
            <Button variant="outline" size="sm" disabled>
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={appointmentToDelete !== null} onOpenChange={(open) => !open && setAppointmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ChevronLeft and ChevronRight are not defined - adding them here
function ChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
