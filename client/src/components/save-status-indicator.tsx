import { Check, AlertCircle, Loader2 } from "lucide-react";
import { SaveStatus } from "@/hooks/use-auto-save";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  errorMessage?: string | null;
}

export function SaveStatusIndicator({ status, errorMessage }: SaveStatusIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'saving' && (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-gray-600 dark:text-gray-400">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-green-600 dark:text-green-400">Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-red-600 dark:text-red-400">
            {errorMessage || 'Failed to save'}
          </span>
        </>
      )}
    </div>
  );
}
