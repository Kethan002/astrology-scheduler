import { useState } from "react";
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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime, getInitials } from "@/lib/utils";
import { 
  Filter, 
  Download, 
  MoreVertical, 
  Edit, 
  Trash2,
  AlertCircle
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

interface AppointmentTableProps {
  appointments: Appointment[];
}

export default function AppointmentTable({ appointments }: AppointmentTableProps) {
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
  
  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/appointments/${id}`);
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
    if (dateFilter === "today") {
      const today = new Date();
      const appDate = new Date(appointment.date);
      if (
        today.getDate() !== appDate.getDate() ||
        today.getMonth() !== appDate.getMonth() ||
        today.getFullYear() !== appDate.getFullYear()
      ) {
        return false;
      }
    } else if (dateFilter === "week") {
      const now = new Date();
      const appDate = new Date(appointment.date);
      const msInWeek = 7 * 24 * 60 * 60 * 1000;
      if (appDate.getTime() - now.getTime() > msInWeek) {
        return false;
      }
    } else if (dateFilter === "month") {
      const now = new Date();
      const appDate = new Date(appointment.date);
      if (
        appDate.getMonth() !== now.getMonth() ||
        appDate.getFullYear() !== now.getFullYear()
      ) {
        return false;
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
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Appt ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-light flex items-center justify-center text-white">
                          <span className="text-xs font-medium">
                            {appointment.user ? getInitials(appointment.user.name) : "U"}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-800">
                            {appointment.user ? appointment.user.name : "User"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {appointment.user ? appointment.user.email : "email@example.com"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-800">{formatDate(date)}</div>
                      <div className="text-xs text-gray-500">
                        {formatTime(date)} - {formatTime(endTime)}
                      </div>
                    </TableCell>
                    <TableCell>15 minutes</TableCell>
                    <TableCell>
                      <span 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statusColors[appointment.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
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
