import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CockpitTabId } from "@/lib/admin-cockpit/loadSnapshot";

type Props = {
  value: CockpitTabId;
  onValueChange: (next: CockpitTabId) => void;
};

export function CockpitTabs({ value, onValueChange }: Props) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <TabsList className="inline-flex h-auto min-w-max max-w-full flex-wrap gap-1 rounded-xl bg-muted/70 p-1 sm:flex-nowrap">
        <TabsTrigger
          value="overview"
          className="rounded-lg px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm"
          data-state={value === "overview" ? "active" : "inactive"}
          onClick={() => onValueChange("overview")}
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="concept_intake"
          className="rounded-lg px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm"
          data-state={value === "concept_intake" ? "active" : "inactive"}
          onClick={() => onValueChange("concept_intake")}
        >
          Concept intake
        </TabsTrigger>
        <TabsTrigger
          value="question_drafts"
          className="rounded-lg px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm"
          data-state={value === "question_drafts" ? "active" : "inactive"}
          onClick={() => onValueChange("question_drafts")}
        >
          Question drafts
        </TabsTrigger>
        <TabsTrigger
          value="editorial_health"
          className="rounded-lg px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm"
          data-state={value === "editorial_health" ? "active" : "inactive"}
          onClick={() => onValueChange("editorial_health")}
        >
          Editorial health
        </TabsTrigger>
        <TabsTrigger
          value="analytics"
          className="rounded-lg px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm"
          data-state={value === "analytics" ? "active" : "inactive"}
          onClick={() => onValueChange("analytics")}
        >
          Analytics
        </TabsTrigger>
        <TabsTrigger
          value="batch_reviews"
          className="rounded-lg px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm"
          data-state={value === "batch_reviews" ? "active" : "inactive"}
          onClick={() => onValueChange("batch_reviews")}
        >
          Batch reviews
        </TabsTrigger>
        <TabsTrigger
          value="legacy"
          className="rounded-lg px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm"
          data-state={value === "legacy" ? "active" : "inactive"}
          onClick={() => onValueChange("legacy")}
        >
          Existing Admin / Legacy
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
