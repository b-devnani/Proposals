import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, FolderOpen, Home, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Proposal } from "@shared/schema";

interface ProjectSidebarProps {
  onSelectProposal?: (proposalId: number) => void;
  currentProposalId?: number;
}

export function ProjectSidebar({ onSelectProposal, currentProposalId }: ProjectSidebarProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);

  const { data: proposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ['/api/proposals'],
  });

  const { data: archivedProposals = [], isLoading: archivedLoading } = useQuery<Proposal[]>({
    queryKey: ['/api/proposals/archived'],
    enabled: showArchived,
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/proposals/${id}/archive`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('Failed to archive proposal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals/archived'] });
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/proposals/${id}/unarchive`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('Failed to unarchive proposal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals/archived'] });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex h-screen">
      {/* Main Proposals Sidebar */}
      <div className="w-80 h-screen bg-background border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Proposals</h2>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`p-2 ${showArchived ? 'bg-muted' : ''}`}
              title={showArchived ? "Hide archived proposals" : "Show archived proposals"}
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <Link href="/">
          <Button className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Select a Floor Plan
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
            <div key={proposal.id} className="relative group">
              <Link 
                href={`/proposal/${proposal.housePlan.toLowerCase()}/${proposal.id}`}
                onClick={() => onSelectProposal?.(proposal.id)}
              >
                <Card 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    currentProposalId === proposal.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium truncate">
                    {proposal.lotNumber} - {proposal.housePlan}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <FolderOpen className="w-3 h-3 mr-1" />
                      {proposal.buyerLastName}
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
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  archiveMutation.mutate(proposal.id);
                }}
                disabled={archiveMutation.isPending}
              >
                <Archive className="w-3 h-3" />
              </Button>
            </div>
          ))
        )}
      </div>
      </div>

      {/* Archived Proposals Sidebar */}
      {showArchived && (
        <div className="w-80 h-screen bg-background border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center">
              <Archive className="w-5 h-5 mr-2" />
              Archived Proposals
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {archivedLoading ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading archived proposals...
              </div>
            ) : archivedProposals.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No archived proposals.
              </div>
            ) : (
              archivedProposals?.map((proposal) => (
                <div key={proposal.id} className="relative group">
                  <Link 
                    href={`/proposal/${proposal.housePlan.toLowerCase()}/${proposal.id}`}
                    onClick={() => onSelectProposal?.(proposal.id)}
                  >
                    <Card 
                      className={`cursor-pointer hover:shadow-md transition-shadow opacity-75 ${
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
                          {proposal.buyerLastName}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      unarchiveMutation.mutate(proposal.id);
                    }}
                    disabled={unarchiveMutation.isPending}
                    title="Unarchive proposal"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
