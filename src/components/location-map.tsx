import { useEffect, useRef } from "react";

export default function LocationMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Check if the iframe already exists to avoid adding multiple
    if (mapContainerRef.current && !mapContainerRef.current.querySelector('iframe')) {
      const iframe = document.createElement('iframe');
      
      // Set Google Maps URL with the provided location
      iframe.src = "https://maps.google.com/maps?q=u1EGzyPmizj8zH7a9&output=embed";
      iframe.width = "100%";
      iframe.height = "100%";
      iframe.frameBorder = "0";
      iframe.style.border = "0";
      iframe.allowFullscreen = true;
      
      // Append the iframe to the container
      mapContainerRef.current.appendChild(iframe);
    }
  }, []);
  
  return (
    <div ref={mapContainerRef} className="h-48 bg-gray-200 flex items-center justify-center">
      {/* The iframe will be added here via useEffect */}
      <div className="text-gray-500 text-sm">Loading map...</div>
    </div>
  );
}
