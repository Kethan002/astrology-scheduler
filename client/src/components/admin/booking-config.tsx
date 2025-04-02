import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingConfig {
  id: number;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export default function BookingConfigSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<{[key: string]: boolean}>({});
  const [configValues, setConfigValues] = useState<{[key: string]: string}>({});
  
  const { data: configs, isLoading, error } = useQuery<BookingConfig[]>({ 
    queryKey: ["/api/booking-configurations"],
    staleTime: 1000 * 60, // 1 minute
  });
  
  useEffect(() => {
    if (configs) {
      const values: {[key: string]: string} = {};
      configs.forEach(config => {
        values[config.key] = config.value;
      });
      setConfigValues(values);
    }
  }, [configs]);
  
  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: string }) => {
      const res = await apiRequest("PUT", `/api/booking-configurations/${id}`, { value });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booking-configurations"] });
      toast({
        title: "Configuration updated",
        description: "The booking configuration has been updated successfully.",
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
  
  const handleEdit = (key: string) => {
    setIsEditing(prev => ({ ...prev, [key]: true }));
  };
  
  const handleSave = (config: BookingConfig) => {
    updateConfigMutation.mutate({ id: config.id, value: configValues[config.key] });
    setIsEditing(prev => ({ ...prev, [config.key]: false }));
  };
  
  const handleChange = (key: string, value: string) => {
    setConfigValues(prev => ({ ...prev, [key]: value }));
  };
  
  const getInputType = (key: string): "number" | "text" => {
    if (key.includes("hour") || key.includes("day")) {
      return "number";
    }
    return "text";
  };
  
  const isUpdating = (key: string) => {
    return updateConfigMutation.isPending && isEditing[key];
  };
  
  const renderConfigCard = (config: BookingConfig) => {
    const inputType = getInputType(config.key);
    
    return (
      <Card key={config.id} className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg capitalize">{config.key.replace(/_/g, ' ')}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="col-span-2">
              <Label htmlFor={`config-${config.key}`}>Value</Label>
              <Input
                id={`config-${config.key}`}
                type={inputType}
                value={configValues[config.key] || ''}
                onChange={e => handleChange(config.key, e.target.value)}
                disabled={!isEditing[config.key] || isUpdating(config.key)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              {!isEditing[config.key] ? (
                <Button onClick={() => handleEdit(config.key)}>
                  Edit
                </Button>
              ) : (
                <Button 
                  onClick={() => handleSave(config)} 
                  disabled={isUpdating(config.key) || configValues[config.key] === config.value}
                >
                  {isUpdating(config.key) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Last updated: {new Date(config.updatedAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error loading booking configurations.</p>
        <p>{(error as Error).message}</p>
      </div>
    );
  }
  
  // Group configurations by category
  const timeWindowConfigs = configs?.filter(c => c.key.includes('window')) || [];
  const slotTimeConfigs = configs?.filter(c => c.key.includes('slot')) || [];
  const otherConfigs = configs?.filter(c => !c.key.includes('window') && !c.key.includes('slot')) || [];
  
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold mb-4">Booking Window Settings</h3>
        <div>
          {timeWindowConfigs.map(renderConfigCard)}
        </div>
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-4">Appointment Slot Settings</h3>
        <div>
          {slotTimeConfigs.map(renderConfigCard)}
        </div>
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-4">Other Settings</h3>
        <div>
          {otherConfigs.map(renderConfigCard)}
        </div>
      </div>
    </div>
  );
}