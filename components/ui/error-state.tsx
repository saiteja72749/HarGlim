"use client";

import { ServerCrash, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./button";
import { Card, CardContent } from "./card";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryAt?: number;
  className?: string;
}

export function ErrorState({
  title = "Oops! Something went wrong",
  message = "Information could not be loaded. Check your connection and retry.",
  onRetry,
  retryAt,
  className = "",
}: ErrorStateProps) {
  const [elapsedAt, setElapsedAt] = useState<number>();
  useEffect(() => {
    if (!retryAt) return;
    const delay = Math.max(0, retryAt - Date.now());
    const timer = window.setTimeout(() => setElapsedAt(retryAt), Math.min(delay, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  return (
    <Card role="alert" className={`border-dashed bg-muted/20 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 motion-safe:animate-ping rounded-full bg-destructive/20" />
          <div className="relative rounded-full bg-destructive/10 p-4">
            <ServerCrash className="h-10 w-10 text-destructive" />
          </div>
        </div>
        
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
          {title}
        </h3>
        
        <p className="text-muted-foreground mb-6 max-w-md">
          {message}
        </p>

        {onRetry && (
          <Button onClick={onRetry} disabled={Boolean(retryAt && elapsedAt !== retryAt)} variant="outline" className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
