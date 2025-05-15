import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BookingDebug() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/debug/booking-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/debug/booking-status");
      return response.json();
    },
  });

  if (isLoading) return <div>Loading debug information...</div>;
  if (error) return <div>Error loading debug information: {error.message}</div>;
  if (!data) return <div>No debug information available</div>;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Booking Status Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">User Status</h3>
            <ul className="list-disc pl-5">
              <li>Has Mobile Number: {data.user.hasMobile ? "Yes" : "No"}</li>
              <li>Is Blocked: {data.user.isBlocked ? "Yes" : "No"}</li>
              {data.user.blockedUntil && (
                <li>Blocked Until: {new Date(data.user.blockedUntil).toLocaleString()}</li>
              )}
              <li>Weekly Appointments: {data.weeklyAppointments}</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold">Booking Configuration</h3>
            <ul className="list-disc pl-5">
              <li>Disabled Days: {data.bookingConfig.disabledDays}</li>
              <li>Morning Slot: {data.bookingConfig.morningSlotStart} - {data.bookingConfig.morningSlotEnd}</li>
              <li>Afternoon Slot: {data.bookingConfig.afternoonSlotStart} - {data.bookingConfig.afternoonSlotEnd}</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 