import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, FolderOpen, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Proposal } from "@shared/schema";

interface ProjectSidebarProps {
  onSelectProposal?: (proposalId: number) => void;
  currentProposalId?: number;
}

export function ProjectSidebar({ onSelectProposal, currentProposalId }: ProjectSidebarProps) {
  const [location] = useLocation();

  const { data: proposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ['/api/proposals'],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="w-80 h-screen bg-background border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Proposals</h2>
          <Link href="/">
            <Button variant="ghost" size="sm" className="p-2">
              <Home className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        
        <Link href="/">
          <Button className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Proposal
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Loading proposals...
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No proposals yet. Create your first proposal to get started.
          </div>
        ) : (
          proposals?.map((proposal) => (
            <Link 
              key={proposal.id}
              href={`/proposal/${proposal.housePlan.toLowerCase()}?proposalId=${proposal.id}`}
              onClick={() => onSelectProposal?.(proposal.id)}
            >
              <Card 
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  currentProposalId === proposal.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium truncate">
                  {proposal.buyerLastName} - {proposal.housePlan}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <FolderOpen className="w-3 h-3 mr-1" />
                    {proposal.community}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Lot: {proposal.lotNumber}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total: ${parseInt(proposal.totalPrice).toLocaleString()}
                  </div>
                </div>
              </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
