import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Archive, FolderOpen, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Proposal } from "@shared/schema";

interface ArchiveSidebarProps {
  onSelectProposal?: (proposalId: number) => void;
  currentProposalId?: number;
}

export function ArchiveSidebar({ onSelectProposal, currentProposalId }: ArchiveSidebarProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const { data: archivedProposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ['/api/proposals/archived'],
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
      queryClient.invalidateQueries({ queryKey: ['/api/proposals/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
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
    <div className="w-80 h-screen bg-background border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center">
            <Archive className="w-5 h-5 mr-2" />
            Archived Proposals
          </h2>
          <Link href="/">
            <Button variant="ghost" size="sm" className="p-2">
              <Home className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Loading archived proposals...
          </div>
        ) : archivedProposals.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No archived proposals. Archive a proposal to see it here.
          </div>
        ) : (
          archivedProposals?.map((proposal) => (
            <div key={proposal.id} className="relative group">
              <Link 
                href={`/proposal/${proposal.housePlan.toLowerCase()}?proposalId=${proposal.id}`}
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
  );
}
