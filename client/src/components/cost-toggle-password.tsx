import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

interface CostTogglePasswordProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export function CostTogglePassword({ isOpen, onClose, onAuthenticated }: CostTogglePasswordProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "8582") {
      onAuthenticated();
      setPassword("");
      setError("");
      onClose();
    } else {
      setError("Incorrect password.");
      setPassword("");
    }
  };

  const handleCancel = () => {
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Access Cost Information
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter password to view builder costs and margins
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cost-password">Password</Label>
              <Input
                id="cost-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="mt-1"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                Enable Cost View
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}