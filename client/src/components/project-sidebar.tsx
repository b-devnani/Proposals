import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, FolderOpen, Home, Archive, RotateCcw, Copy, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Proposal, Community } from "@shared/schema";

interface ProjectSidebarProps {
  onSelectProposal?: (proposalId: number) => void;
  currentProposalId?: number;
}

export function ProjectSidebar({ onSelectProposal, currentProposalId }: ProjectSidebarProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [filterCommunity, setFilterCommunity] = useState<string>("all");

  const { data: proposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ['/api/proposals'],
  });

  const { data: archivedProposals = [], isLoading: archivedLoading } = useQuery<Proposal[]>({
    queryKey: ['/api/proposals/archived'],
    enabled: showArchived,
  });

  const { data: communities = [] } = useQuery<Community[]>({
    queryKey: ["/api/communities"],
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

  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/proposals/${id}/duplicate`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to duplicate proposal');
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

  // Filter, search, and sort proposals
  const filteredAndSortedProposals = useMemo(() => {
    let result = [...proposals];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.buyerLastName.toLowerCase().includes(query) ||
        p.lotNumber.toLowerCase().includes(query) ||
        p.housePlan.toLowerCase().includes(query) ||
        p.community.toLowerCase().includes(query)
      );
    }

    // Apply community filter
    if (filterCommunity !== "all") {
      result = result.filter(p => p.community === filterCommunity);
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => b.id - a.id);
        break;
      case "oldest":
        result.sort((a, b) => a.id - b.id);
        break;
      case "buyer-az":
        result.sort((a, b) => a.buyerLastName.localeCompare(b.buyerLastName));
        break;
      case "buyer-za":
        result.sort((a, b) => b.buyerLastName.localeCompare(a.buyerLastName));
        break;
      case "lot-asc":
        result.sort((a, b) => a.lotNumber.localeCompare(b.lotNumber));
        break;
      case "lot-desc":
        result.sort((a, b) => b.lotNumber.localeCompare(a.lotNumber));
        break;
      case "price-high":
        result.sort((a, b) => parseFloat(b.totalPrice) - parseFloat(a.totalPrice));
        break;
      case "price-low":
        result.sort((a, b) => parseFloat(a.totalPrice) - parseFloat(b.totalPrice));
        break;
    }

    return result;
  }, [proposals, searchQuery, sortBy, filterCommunity]);

  // Filter, search, and sort archived proposals
  const filteredAndSortedArchived = useMemo(() => {
    let result = [...archivedProposals];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.buyerLastName.toLowerCase().includes(query) ||
        p.lotNumber.toLowerCase().includes(query) ||
        p.housePlan.toLowerCase().includes(query) ||
        p.community.toLowerCase().includes(query)
      );
    }

    // Apply community filter
    if (filterCommunity !== "all") {
      result = result.filter(p => p.community === filterCommunity);
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => b.id - a.id);
        break;
      case "oldest":
        result.sort((a, b) => a.id - b.id);
        break;
      case "buyer-az":
        result.sort((a, b) => a.buyerLastName.localeCompare(b.buyerLastName));
        break;
      case "buyer-za":
        result.sort((a, b) => b.buyerLastName.localeCompare(a.buyerLastName));
        break;
      case "lot-asc":
        result.sort((a, b) => a.lotNumber.localeCompare(b.lotNumber));
        break;
      case "lot-desc":
        result.sort((a, b) => b.lotNumber.localeCompare(a.lotNumber));
        break;
      case "price-high":
        result.sort((a, b) => parseFloat(b.totalPrice) - parseFloat(a.totalPrice));
        break;
      case "price-low":
        result.sort((a, b) => parseFloat(a.totalPrice) - parseFloat(b.totalPrice));
        break;
    }

    return result;
  }, [archivedProposals, searchQuery, sortBy, filterCommunity]);

  return (
    <div className="flex h-screen">
      {/* Main Proposals Sidebar */}
      <div className="w-80 h-screen bg-background border-r border-border flex flex-col">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
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
            Create a New Proposal
          </Button>
        </Link>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by buyer, lot, or plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Sort and Filter */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="buyer-az">Buyer A-Z</SelectItem>
              <SelectItem value="buyer-za">Buyer Z-A</SelectItem>
              <SelectItem value="lot-asc">Lot Number ↑</SelectItem>
              <SelectItem value="lot-desc">Lot Number ↓</SelectItem>
              <SelectItem value="price-high">Price High-Low</SelectItem>
              <SelectItem value="price-low">Price Low-High</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCommunity} onValueChange={setFilterCommunity}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Filter community" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Communities</SelectItem>
              {communities.map((community) => (
                <SelectItem key={community.id} value={community.name}>
                  {community.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Loading proposals...
          </div>
        ) : filteredAndSortedProposals.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {searchQuery || filterCommunity !== "all" 
              ? "No proposals match your search criteria." 
              : "No proposals yet. Create your first proposal to get started."}
          </div>
        ) : (
          filteredAndSortedProposals?.map((proposal) => (
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
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    duplicateMutation.mutate(proposal.id);
                  }}
                  disabled={duplicateMutation.isPending}
                  title="Duplicate proposal"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    archiveMutation.mutate(proposal.id);
                  }}
                  disabled={archiveMutation.isPending}
                  title="Archive proposal"
                >
                  <Archive className="w-3 h-3" />
                </Button>
              </div>
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
            ) : filteredAndSortedArchived.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                {searchQuery || filterCommunity !== "all" 
                  ? "No archived proposals match your search criteria." 
                  : "No archived proposals."}
              </div>
            ) : (
              filteredAndSortedArchived?.map((proposal) => (
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
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-6 w-6"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        duplicateMutation.mutate(proposal.id);
                      }}
                      disabled={duplicateMutation.isPending}
                      title="Duplicate proposal"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-6 w-6"
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
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
