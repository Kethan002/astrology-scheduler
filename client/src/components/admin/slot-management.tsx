import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getTimeSlots, formatDate, formatTime } from "@/lib/utils";
import { addDays, isSameDay, format } from "date-fns";
import { CalendarDays, Plus, Save, Clock, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SlotManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTab, setSelectedTab] = useState<string>("calendar");
  const [bulkEnabled, setBulkEnabled] = useState(true);
  const [isPending, setIsPending] = useState<{[key: string]: boolean}>({});
  
  // Get available slots from API with optimized caching strategy
  const { data: availableSlots = [], isLoading } = useQuery({
    queryKey: ["/api/available-slots"],
    queryFn: async () => {
      const response = await fetch("/api/available-slots");
      if (!response.ok) {
        throw new Error("Failed to fetch available slots");
      }
      return response.json();
    },
    refetchInterval: 10000, // Reduced refetch frequency to 10 seconds
    staleTime: 5000, // Data considered fresh for 5 seconds
  });
  
  // Create a new available slot with optimistic updates
  const createSlotMutation = useMutation({
    mutationFn: async ({ date, isEnabled }: { date: Date, isEnabled: boolean }) => {
      try {
        const slotData = {
          date: date.toISOString(),
          isEnabled,
          duration: 15,
          status: "available"
        };
        const response = await apiRequest("POST", "/api/available-slots", slotData);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create slot");
        }
        return await response.json();
      } catch (error) {
        console.error("Create slot error:", error);
        throw error;
      }
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/available-slots"] });
      
      // Snapshot the previous value
      const previousSlots = queryClient.getQueryData(["/api/available-slots"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/available-slots"], (old: any) => {
        // Generate a temporary ID for the new slot
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newSlot = {
          id: tempId,
          date: variables.date.toISOString(),
          isEnabled: variables.isEnabled,
          duration: 15,
          status: "available"
        };
        return [...old, newSlot];
      });
      
      const slotKey = getSlotKey(variables.date);
      setIsPending(prev => ({ ...prev, [slotKey]: true }));
      
      // Return a context object with the snapshot
      return { previousSlots };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context we saved to roll back
      if (context?.previousSlots) {
        queryClient.setQueryData(["/api/available-slots"], context.previousSlots);
      }
      
      const slotKey = getSlotKey(variables.date);
      setIsPending(prev => ({ ...prev, [slotKey]: false }));
      
      toast({
        title: "Creation Failed",
        description: err.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/available-slots"] });
    },
    onSettled: (data, error, variables) => {
      const slotKey = getSlotKey(variables.date);
      setIsPending(prev => ({ ...prev, [slotKey]: false }));
    },
  });
  
  // Update an existing available slot with optimistic updates
  const updateSlotMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: number, isEnabled: boolean }) => {
      await apiRequest("PUT", `/api/available-slots/${id}`, { isEnabled });
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/available-slots"] });
      
      // Snapshot the previous value
      const previousSlots = queryClient.getQueryData(["/api/available-slots"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/available-slots"], (old: any) => {
        return old.map((slot: any) => {
          if (slot.id === variables.id) {
            return { ...slot, isEnabled: variables.isEnabled };
          }
          return slot;
        });
      });
      
      const date = getSlotDateById(variables.id);
      if (date) {
        const slotKey = getSlotKey(date);
        setIsPending(prev => ({ ...prev, [slotKey]: true }));
      }
      
      // Return a context object with the snapshot
      return { previousSlots };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context we saved to roll back
      if (context?.previousSlots) {
        queryClient.setQueryData(["/api/available-slots"], context.previousSlots);
      }
      
      const date = getSlotDateById(variables.id);
      if (date) {
        const slotKey = getSlotKey(date);
        setIsPending(prev => ({ ...prev, [slotKey]: false }));
      }
      
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/available-slots"] });
    },
    onSettled: (data, error, variables) => {
      const date = getSlotDateById(variables.id);
      if (date) {
        const slotKey = getSlotKey(date);
        setIsPending(prev => ({ ...prev, [slotKey]: false }));
      }
    },
  });
  
  // Delete an available slot with optimistic updates
  const deleteSlotMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/available-slots/${id}`);
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/available-slots"] });
      
      // Snapshot the previous value
      const previousSlots = queryClient.getQueryData(["/api/available-slots"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/available-slots"], (old: any) => {
        return old.filter((slot: any) => slot.id !== id);
      });
      
      // Return a context object with the snapshot
      return { previousSlots };
    },
    onError: (err, id, context) => {
      // If the mutation fails, use the context we saved to roll back
      if (context?.previousSlots) {
        queryClient.setQueryData(["/api/available-slots"], context.previousSlots);
      }
      
      toast({
        title: "Deletion Failed",
        description: err.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Slot Deleted",
        description: "The appointment slot has been deleted successfully.",
      });
    },
  });
  
  // Get all time slots for a selected date
  const timeSlots = selectedDate ? getTimeSlots(selectedDate) : [];
  
  // Helper function to create a unique key for a slot based on its date/time
  const getSlotKey = (date: Date) => {
    return `${date.toDateString()}-${date.getHours()}-${date.getMinutes()}`;
  };
  
  // Get slot date by ID
  const getSlotDateById = (id: number | string) => {
    const slot = availableSlots.find((s: any) => s.id === id);
    return slot ? new Date(slot.date) : null;
  };
  
  // Check if a slot exists and is enabled
  const isSlotEnabledAndExists = (date: Date) => {
    return availableSlots.some((slot: any) => {
      const slotDate = new Date(slot.date);
      return isSameDay(date, slotDate) && 
             date.getHours() === slotDate.getHours() && 
             date.getMinutes() === slotDate.getMinutes() &&
             slot.isEnabled;
    });
  };
  
  // Get slot ID if it exists
  const getSlotId = (date: Date) => {
    const slot = availableSlots.find((slot: any) => {
      const slotDate = new Date(slot.date);
      return isSameDay(date, slotDate) && 
             date.getHours() === slotDate.getHours() && 
             date.getMinutes() === slotDate.getMinutes();
    });
    return slot ? slot.id : null;
  };
  
  // Toggle a single slot
  const toggleSlot = (date: Date) => {
    const slotId = getSlotId(date);
    const isEnabled = !isSlotEnabledAndExists(date);
    
    if (slotId) {
      updateSlotMutation.mutate({ id: slotId, isEnabled });
    } else {
      createSlotMutation.mutate({ date, isEnabled });
    }
  };
  
  // Batch update multiple slots with a single UI update
  const batchUpdateSlots = (slots: Date[], isEnabled: boolean) => {
    // Optimistically update all slots in the UI
    const updatesMap = new Map();
    const slotsToUpdate = [];
    const slotsToCreate = [];
    
    // Prepare data for updates
    slots.forEach(slot => {
      const slotId = getSlotId(slot);
      const slotKey = getSlotKey(slot);
      
      // Mark as pending in the UI
      setIsPending(prev => ({ ...prev, [slotKey]: true }));
      
      if (slotId) {
        // If slot exists, queue for update
        slotsToUpdate.push({ id: slotId, isEnabled });
        updatesMap.set(slotId, { date: slot, isEnabled });
      } else if (isEnabled) {
        // If slot doesn't exist and should be enabled, queue for creation
        slotsToCreate.push(slot);
      }
    });
    
    // Optimistically apply all updates to the UI
    if (slotsToUpdate.length > 0 || slotsToCreate.length > 0) {
      // Take a snapshot of the current state
      const previousSlots = queryClient.getQueryData(["/api/available-slots"]);
      
      // Apply optimistic updates
      queryClient.setQueryData(["/api/available-slots"], (old: any = []) => {
        // Process updates for existing slots
        const updatedData = old.map((slot: any) => {
          if (updatesMap.has(slot.id)) {
            return { ...slot, isEnabled: updatesMap.get(slot.id).isEnabled };
          }
          return slot;
        });
        
        // Add new slots if needed
        const newSlots = slotsToCreate.map(date => ({
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: date.toISOString(),
          isEnabled: true,
          duration: 15,
          status: "available"
        }));
        
        return [...updatedData, ...newSlots];
      });
      
      // Process actual API updates in parallel batches
      Promise.all([
        // Update existing slots
        ...slotsToUpdate.map(({ id, isEnabled }) => 
          apiRequest("PUT", `/api/available-slots/${id}`, { isEnabled })
            .catch(error => console.error("Error updating slot:", error))
        ),
        
        // Create new slots
        ...slotsToCreate.map(date => {
          const slotData = {
            date: date.toISOString(),
            isEnabled: true,
            duration: 15,
            status: "available"
          };
          return apiRequest("POST", "/api/available-slots", slotData)
            .catch(error => console.error("Error creating slot:", error));
        })
      ])
      .then(() => {
        // After all operations complete, refresh the data
        queryClient.invalidateQueries({ queryKey: ["/api/available-slots"] });
        
        // Reset pending states
        let newPendingState = { ...isPending };
        slots.forEach(slot => {
          const slotKey = getSlotKey(slot);
          delete newPendingState[slotKey];
        });
        setIsPending(newPendingState);
        
        // Show success toast
        toast({
          title: isEnabled ? "Slots Enabled" : "Slots Disabled",
          description: `${slots.length} slots have been ${isEnabled ? "enabled" : "disabled"}.`,
        });
      })
      .catch(error => {
        // On error, roll back to previous state
        queryClient.setQueryData(["/api/available-slots"], previousSlots);
        
        // Reset pending states
        let newPendingState = { ...isPending };
        slots.forEach(slot => {
          const slotKey = getSlotKey(slot);
          delete newPendingState[slotKey];
        });
        setIsPending(newPendingState);
        
        toast({
          title: "Operation Failed",
          description: "There was an error updating slots. Please try again.",
          variant: "destructive",
        });
      });
    }
  };
  
  // Generate slots for next 7 days
  const generateSlotsForNextWeek = () => {
    const now = new Date(); 
    const startDate = now;
    const slotsToCreate = [];
    
    // Show toast at the beginning of the operation
    toast({
      title: "Generating Slots",
      description: "Creating appointment slots for the next week...",
    });
    
    // Build the list of slots to create
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(startDate, i);
      
      // Skip Tuesdays (2) and Saturdays (6)
      if (currentDate.getDay() === 2 || currentDate.getDay() === 6) {
        continue;
      }
      
      // Generate morning slots (9 AM - 1 PM)
      for (let hour = 9; hour < 13; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const slotDate = new Date(currentDate);
          slotDate.setHours(hour, minute, 0, 0);
          slotsToCreate.push(slotDate);
        }
      }
      
      // Generate afternoon slots (3 PM - 5 PM)
      for (let hour = 15; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const slotDate = new Date(currentDate);
          slotDate.setHours(hour, minute, 0, 0);
          slotsToCreate.push(slotDate);
        }
      }
    }
    
    // Create the slots with optimistic UI updates
    batchUpdateSlots(slotsToCreate, bulkEnabled);
  };
  
  // Build a table of slots for the selected date
  const buildSlotsTable = () => {
    if (!selectedDate) return null;
    
    // Skip rendering if it's Tuesday (2) or Saturday (6)
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 2 || dayOfWeek === 6) {
      return (
        <div className="flex items-center justify-center h-64 text-center text-gray-500 p-4">
          <div>
            <p className="font-medium text-lg mb-2">No slots available</p>
            <p>Appointments are not scheduled on {dayOfWeek === 2 ? 'Tuesdays' : 'Saturdays'}.</p>
            <p>Please select a different day.</p>
          </div>
        </div>
      );
    }
    
    // Separate slots into morning and afternoon
    const morningSlots = timeSlots.filter(slot => slot.getHours() < 13);
    const afternoonSlots = timeSlots.filter(slot => slot.getHours() >= 15);
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3">Morning Slots (9:00 AM - 1:00 PM)</h3>
          <div className="grid grid-cols-4 gap-3">
            {morningSlots.map((slot, index) => {
              const isEnabled = isSlotEnabledAndExists(slot);
              const slotKey = getSlotKey(slot);
              const isButtonPending = isPending[slotKey];
              
              return (
                <Button
                  key={index}
                  variant={isEnabled ? "default" : "outline"}
                  size="sm"
                  className={`justify-start px-3 ${isEnabled ? "bg-green-100 text-green-800 hover:bg-green-200" : "hover:border-gray-400"}`}
                  disabled={isButtonPending}
                  onClick={() => toggleSlot(slot)}
                >
                  {isButtonPending ? (
                    <div className="h-4 w-4 rounded-full border-2 border-b-transparent border-green-800 animate-spin mr-2" />
                  ) : isEnabled ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : null}
                  {formatTime(slot)}
                </Button>
              );
            })}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Afternoon Slots (3:00 PM - 5:00 PM)</h3>
          <div className="grid grid-cols-4 gap-3">
            {afternoonSlots.map((slot, index) => {
              const isEnabled = isSlotEnabledAndExists(slot);
              const slotKey = getSlotKey(slot);
              const isButtonPending = isPending[slotKey];
              
              return (
                <Button
                  key={index}
                  variant={isEnabled ? "default" : "outline"}
                  size="sm"
                  className={`justify-start px-3 ${isEnabled ? "bg-green-100 text-green-800 hover:bg-green-200" : "hover:border-gray-400"}`}
                  disabled={isButtonPending}
                  onClick={() => toggleSlot(slot)}
                >
                  {isButtonPending ? (
                    <div className="h-4 w-4 rounded-full border-2 border-b-transparent border-green-800 animate-spin mr-2" />
                  ) : isEnabled ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : null}
                  {formatTime(slot)}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  // List of all available slots with optimized rendering
  const buildSlotsList = () => {
    if (isLoading) {
      return <div className="text-center py-4">Loading slots...</div>;
    }
    
    if (!availableSlots.length) {
      return <div className="text-center py-4">No slots have been created yet.</div>;
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {availableSlots.map((slot: any) => {
            const slotDate = new Date(slot.date);
            return (
              <TableRow key={slot.id}>
                <TableCell>{formatDate(slotDate)}</TableCell>
                <TableCell>{formatTime(slotDate)}</TableCell>
                <TableCell>
                  <Badge variant={slot.isEnabled ? "success" : "outline"}>
                    {slot.isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateSlotMutation.mutate({ id: slot.id, isEnabled: !slot.isEnabled })}
                  >
                    {slot.isEnabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => deleteSlotMutation.mutate(slot.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };
  
  // Toggle button for bulk actions
  const ToggleButton = ({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) => (
    <Button
      variant={checked ? "default" : "outline"}
      className={checked ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
      onClick={() => onChange(!checked)}
    >
      {checked ? <Check className="h-4 w-4 mr-2" /> : null}
      {checked ? "Enabled" : "Disabled"}
    </Button>
  );
  
  return (
    <Tabs value={selectedTab} onValueChange={setSelectedTab}>
      <TabsList className="grid grid-cols-3 mb-6">
        <TabsTrigger value="calendar">
          <CalendarDays className="h-4 w-4 mr-2" />
          Calendar View
        </TabsTrigger>
        <TabsTrigger value="list">
          <Clock className="h-4 w-4 mr-2" />
          All Slots
        </TabsTrigger>
        <TabsTrigger value="bulk">
          <Plus className="h-4 w-4 mr-2" />
          Bulk Create
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="calendar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
              <CardDescription>
                Choose a date to manage available time slots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Manage Time Slots</CardTitle>
              <CardDescription>
                {selectedDate ? formatDate(selectedDate) : "Please select a date"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDate ? buildSlotsTable() : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <p>Select a date from the calendar to manage slots</p>
                </div>
              )}
            </CardContent>
            {selectedDate && selectedDate.getDay() !== 2 && selectedDate.getDay() !== 6 && (
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Get all enabled slots for this date
                    const slotsToDisable = timeSlots.filter(slot => isSlotEnabledAndExists(slot));
                    if (slotsToDisable.length) {
                      // Apply optimistic bulk update
                      batchUpdateSlots(slotsToDisable, false);
                    } else {
                      toast({
                        title: "No Action Required",
                        description: "There are no enabled slots to reset.",
                      });
                    }
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => {
                    // Get all slots that aren't enabled
                    const slotsToEnable = timeSlots.filter(slot => !isSlotEnabledAndExists(slot));
                    if (slotsToEnable.length) {
                      // Apply optimistic bulk update
                      batchUpdateSlots(slotsToEnable, true);
                    } else {
                      toast({
                        title: "No Action Required",
                        description: "All slots are already enabled.",
                      });
                    }
                  }}
                >
                  Select All
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </TabsContent>
      
      <TabsContent value="list">
        <Card>
          <CardHeader>
            <CardTitle>All Available Slots</CardTitle>
            <CardDescription>
              View and manage all created appointment slots
            </CardDescription>
          </CardHeader>
          <CardContent>
            {buildSlotsList()}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="bulk">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Create Slots</CardTitle>
            <CardDescription>
              Generate appointment slots for multiple days at once
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Default Status</h3>
              <div className="flex items-center space-x-2">
                <ToggleButton 
                  checked={bulkEnabled}
                  onChange={setBulkEnabled}
                />
                <Label className="ml-2">
                  All created slots will be {bulkEnabled ? "enabled" : "disabled"} by default
                </Label>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-3">Quick Generation</h3>
              <Button onClick={generateSlotsForNextWeek}>
                <Save className="h-4 w-4 mr-2" />
                Generate Slots for Next 7 Days
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                This will create all available slots for the next 7 days, excluding Tuesdays and Saturdays.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}