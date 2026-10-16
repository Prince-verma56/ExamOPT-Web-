import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
}

export function ErrorState({ title = "Something went wrong", message = "An unexpected error occurred.", retry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
      <Alert variant="destructive" className="max-w-md text-left">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-4">
          <p>{message}</p>
          {retry && (
            <Button variant="outline" size="sm" onClick={retry} className="self-start">
              Try again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
