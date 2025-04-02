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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getTimeSlots, formatDate, formatTime } from "@/lib/utils";
import { addDays, isSameDay, format, isValid, isAfter, setHours, setMinutes } from "date-fns";
import { CalendarDays, Plus, Save, Clock, X } from "lucide-react";

export default function SlotManagement() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTab, setSelectedTab] = useState<string>("calendar");
  const [bulkEnabled, setBulkEnabled] = useState(true);
  
  // Get available slots from API
  const { data: availableSlots = [], isLoading } = useQuery({
    queryKey: ["/api/available-slots"],
  });
  
  // Create a new available slot
  const createSlotMutation = useMutation({
    mutationFn: async ({ date, isEnabled }: { date: Date, isEnabled: boolean }) => {
      const slotData = { 
        date: date.toISOString(),
        isEnabled 
      };
      await apiRequest("POST", "/api/available-slots", slotData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/available-slots"] });
      toast({
        title: "Slot Created",
        description: "The appointment slot has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update an existing available slot
  const updateSlotMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: number, isEnabled: boolean }) => {
      await apiRequest("PUT", `/api/available-slots/${id}`, { isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/available-slots"] });
      toast({
        title: "Slot Updated",
        description: "The appointment slot has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete an available slot
  const deleteSlotMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/available-slots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/available-slots"] });
      toast({
        title: "Slot Deleted",
        description: "The appointment slot has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Get all time slots for a selected date
  const timeSlots = selectedDate ? getTimeSlots(selectedDate) : [];
  
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
  
  // Generate slots for next 7 days
  const generateSlotsForNextWeek = () => {
    const now = new Date();
    const startDate = now;
    
    // Generate slots for next 7 days
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
          
          // Only create future slots
          if (isAfter(slotDate, now)) {
            createSlotMutation.mutate({ date: slotDate, isEnabled: bulkEnabled });
          }
        }
      }
      
      // Generate afternoon slots (3 PM - 5 PM)
      for (let hour = 15; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const slotDate = new Date(currentDate);
          slotDate.setHours(hour, minute, 0, 0);
          
          // Only create future slots
          if (isAfter(slotDate, now)) {
            createSlotMutation.mutate({ date: slotDate, isEnabled: bulkEnabled });
          }
        }
      }
    }
    
    toast({
      title: "Slots Generated",
      description: `Appointment slots for the next week have been ${bulkEnabled ? 'enabled' : 'disabled'}.`,
    });
  };
  
  // Build a table of slots for the selected date
  const buildSlotsTable = () => {
    if (!selectedDate) return null;
    
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
              return (
                <div key={index} className="flex items-center space-x-2">
                  <Switch
                    id={`morning-slot-${index}`}
                    checked={isEnabled}
                    onCheckedChange={() => toggleSlot(slot)}
                  />
                  <Label htmlFor={`morning-slot-${index}`}>{formatTime(slot)}</Label>
                </div>
              );
            })}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Afternoon Slots (3:00 PM - 5:00 PM)</h3>
          <div className="grid grid-cols-4 gap-3">
            {afternoonSlots.map((slot, index) => {
              const isEnabled = isSlotEnabledAndExists(slot);
              return (
                <div key={index} className="flex items-center space-x-2">
                  <Switch
                    id={`afternoon-slot-${index}`}
                    checked={isEnabled}
                    onCheckedChange={() => toggleSlot(slot)}
                  />
                  <Label htmlFor={`afternoon-slot-${index}`}>{formatTime(slot)}</Label>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  // List of all available slots
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    slot.isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {slot.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
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
            {selectedDate && (
              <CardFooter className="flex justify-between">
                <Button variant="outline">Reset</Button>
                <Button>Save Changes</Button>
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
                <Switch
                  id="bulk-enabled"
                  checked={bulkEnabled}
                  onCheckedChange={setBulkEnabled}
                />
                <Label htmlFor="bulk-enabled">
                  {bulkEnabled ? "Enabled" : "Disabled"}
                </Label>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                All created slots will be {bulkEnabled ? "enabled" : "disabled"} by default
              </p>
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
