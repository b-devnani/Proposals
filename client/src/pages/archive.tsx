import { Archive } from "lucide-react";
import { ArchiveSidebar } from "@/components/archive-sidebar";

export default function ArchivePage() {
  return (
    <div className="flex h-screen">
      <ArchiveSidebar />
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4">
          <Archive className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">Archived Proposals</h1>
          <p className="text-muted-foreground max-w-md">
            Select an archived proposal from the sidebar to view its details, or unarchive it to move it back to your active proposals.
          </p>
        </div>
      </div>
    </div>
  );
}
