import { Link } from "wouter";
import { ChefHat, Twitter, Instagram, Facebook, Github, Cookie } from "lucide-react";
import { logoUrl } from "@/lib/constants";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CookieSettings } from "./CookieSettings";

export default function Footer() {
  const [showCookieSettings, setShowCookieSettings] = useState(false);

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
      <div className="container px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and Welcome Link */}
          <div className="flex items-center gap-4">
            <Link href="/welcome" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={logoUrl} alt="Dine-N" className="h-8" />
              <span className="text-lg font-semibold text-primary">Dine-N</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link href="/welcome" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Welcome
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <Link href="/recipes" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Recipes
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <button 
              onClick={() => setShowCookieSettings(true)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Cookie className="h-3 w-3" />
              Cookie Settings
            </button>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a 
              href="https://twitter.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Follow us on Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a 
              href="https://instagram.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Follow us on Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a 
              href="https://facebook.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a 
              href="https://github.com/dinen" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="View our GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Copyright and Legal */}
        <div className="mt-6 pt-6 border-t text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Dine-N. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            AI-generated content is for informational purposes only. Please exercise your own judgment regarding food safety and dietary decisions.
          </p>
        </div>
      </div>

      {/* Cookie Settings Dialog */}
      <Dialog open={showCookieSettings} onOpenChange={setShowCookieSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
          </DialogHeader>
          <CookieSettings onClose={() => setShowCookieSettings(false)} />
        </DialogContent>
      </Dialog>
    </footer>
  );
} 