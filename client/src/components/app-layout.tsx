import { useState } from "react";
import { useLocation } from "wouter";
import { ProjectSidebar } from "./project-sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [currentProposalId, setCurrentProposalId] = useState<number | undefined>();

  // Extract proposalId from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const proposalIdFromUrl = urlParams.get('proposalId');
  
  // Update currentProposalId based on URL
  if (proposalIdFromUrl) {
    const newProposalId = parseInt(proposalIdFromUrl);
    if (currentProposalId !== newProposalId) {
      setCurrentProposalId(newProposalId);
    }
  } else {
    // Clear currentProposalId if no proposalId in URL
    if (currentProposalId !== undefined) {
      setCurrentProposalId(undefined);
    }
  }

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
