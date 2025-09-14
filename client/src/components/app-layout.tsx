import { useState } from "react";
import { useLocation } from "wouter";
import { ProjectSidebar } from "./project-sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [currentProposalId, setCurrentProposalId] = useState<number | undefined>();

  // Show sidebar on all pages
  const showSidebar = true;

  return (
    <div className="flex h-screen bg-background">
      {showSidebar && (
        <ProjectSidebar 
          onSelectProposal={setCurrentProposalId}
          currentProposalId={currentProposalId}
        />
      )}
      <div className={`flex-1 ${showSidebar ? '' : 'w-full'}`}>
        {children}
      </div>
    </div>
  );
}
