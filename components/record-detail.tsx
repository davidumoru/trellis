"use client";

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { InboxIcon } from "@/lib/icons";

interface RecordDetailProps {
  applicationId?: string;
}

export function RecordDetail({ applicationId }: RecordDetailProps) {
  if (!applicationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>No application selected</EmptyTitle>
            <EmptyDescription>
              Select an application from the pipeline or add a new one to get started.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Application detail view coming soon
      </p>
    </div>
  );
}
