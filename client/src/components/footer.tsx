
import { Moon, MapPin, Phone, Mail, Clock, Calendar, Star, Shield, Facebook, Instagram } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TabNavigation from "@/components/tab-navigation";
import PrivacyPolicy from './privacy-policy';

export default function Footer() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Column 1: Logo and Quote */}
          <div className="text-center md:text-left">
            <div className="flex items-center mb-4 justify-center md:justify-start">
              <Moon className="h-6 w-6 text-yellow-400 mr-2" />
              <h3 className="font-heading font-bold text-lg">Astro Appointments</h3>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              "Astrology is the science of stars that reveals the divine plan for your life."
              <br/>
              <span className="text-yellow-400 mt-2 block">
                "జ్యోతిష్యం మీ జీవితానికి దైవిక మార్గదర్శనం"
              </span>
            </p>
          </div>
          
          {/* Column 2: Quick Links */}
          <div>
            <h4 className="font-heading font-semibold mb-4 text-center md:text-left">Quick Links</h4>
            <ul className="space-y-3 text-gray-300 text-center md:text-left">
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }} className="hover:text-yellow-400 transition-colors cursor-pointer">Home</a>
              </li>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); window.location.href = '/?tab=book'; }} className="hover:text-yellow-400 transition-colors cursor-pointer">Book Appointment</a>
              </li>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); window.location.href = '/?tab=appointments'; }} className="hover:text-yellow-400 transition-colors cursor-pointer">My Appointments</a>
              </li>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); window.location.href = '/?tab=profile'; }} className="hover:text-yellow-400 transition-colors cursor-pointer">My Profile</a>
              </li>
            </ul>
          </div>
          
          {/* Column 3: Contact & Support */}
          <div>
            <h4 className="font-heading font-semibold mb-4 text-center md:text-left">Contact & Support</h4>
            <ul className="space-y-3 text-gray-300 text-center md:text-left">
              <li className="flex items-start justify-center md:justify-start">
                <MapPin className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <a 
                  href="https://maps.app.goo.gl/VMpH4YiZQy4rcELp9" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-yellow-400 transition-colors"
                >
                  Veldandi Omkaram Astrology Center
                </a>
              </li>
              
              <li className="flex items-start justify-center md:justify-start">
                <Phone className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <a 
                  href="https://wa.me/919494276797" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-yellow-400 transition-colors"
                >
                  9494276797 (WhatsApp messages only)
                </a>
              </li>
              <li className="flex items-start justify-center md:justify-start">
                <Clock className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <div>
                  <div>Morning: 9 AM to 1 PM</div>
                  <div>Afternoon: 3 PM to 5 PM</div>
                  <div className="text-yellow-400 text-sm mt-1">Except Tuesday & Saturday</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex justify-center space-x-4 mb-4">
            <button onClick={() => setShowPrivacy(true)} className="text-gray-300 hover:text-yellow-400 transition-colors">Privacy Policy</button>
          </div>

          <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Privacy Policy / గోప్యతా విధానం</DialogTitle>
              </DialogHeader>
              <PrivacyPolicy />
            </DialogContent>
          </Dialog>
          <p className="text-center text-sm text-gray-400">&copy; 2025 Astro Appointments. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}