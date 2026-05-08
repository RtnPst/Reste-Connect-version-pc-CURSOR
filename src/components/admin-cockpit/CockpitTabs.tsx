import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CockpitTabId } from "@/lib/admin-cockpit/loadSnapshot";

type Props = {
  value: CockpitTabId;
  onValueChange: (next: CockpitTabId) => void;
};

const tabTriggerClass =
  "shrink-0 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium leading-snug transition-colors min-h-[44px] sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-sm data-[state=active]:z-[1] data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-primary/35";

export function CockpitTabs({ value, onValueChange }: Props) {
  return (
    <div className="-mx-1 touch-pan-x overflow-x-auto overflow-y-visible overscroll-x-contain px-1 pb-1 [scrollbar-width:thin] sm:mx-0 sm:px-0">
      <TabsList className="inline-flex h-auto min-h-11 w-max min-w-0 flex-nowrap items-stretch justify-start gap-1 rounded-xl bg-muted/70 p-1.5 text-muted-foreground sm:min-h-9 sm:items-center">
        <TabsTrigger
          value="overview"
          className={tabTriggerClass}
          data-state={value === "overview" ? "active" : "inactive"}
          aria-label="Overview cockpit (lecture seule)"
          onClick={() => onValueChange("overview")}
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="concept_intake"
          className={tabTriggerClass}
          data-state={value === "concept_intake" ? "active" : "inactive"}
          aria-label="Concept intake (lecture seule)"
          onClick={() => onValueChange("concept_intake")}
        >
          Concept intake
        </TabsTrigger>
        <TabsTrigger
          value="question_drafts"
          className={tabTriggerClass}
          data-state={value === "question_drafts" ? "active" : "inactive"}
          aria-label="Question drafts (lecture seule)"
          onClick={() => onValueChange("question_drafts")}
        >
          Question drafts
        </TabsTrigger>
        <TabsTrigger
          value="editorial_health"
          className={tabTriggerClass}
          data-state={value === "editorial_health" ? "active" : "inactive"}
          aria-label="Santé éditoriale (lecture seule)"
          onClick={() => onValueChange("editorial_health")}
        >
          Editorial health
        </TabsTrigger>
        <TabsTrigger
          value="analytics"
          className={tabTriggerClass}
          data-state={value === "analytics" ? "active" : "inactive"}
          aria-label="Analytics agrégées (lecture seule)"
          onClick={() => onValueChange("analytics")}
        >
          Analytics
        </TabsTrigger>
        <TabsTrigger
          value="batch_reviews"
          className={tabTriggerClass}
          data-state={value === "batch_reviews" ? "active" : "inactive"}
          aria-label="Revues batch (lecture seule)"
          onClick={() => onValueChange("batch_reviews")}
        >
          Batch reviews
        </TabsTrigger>
        <TabsTrigger
          value="legacy"
          className={`${tabTriggerClass} max-w-[10.5rem] whitespace-normal text-center sm:max-w-[16rem] sm:whitespace-nowrap`}
          data-state={value === "legacy" ? "active" : "inactive"}
          aria-label="Quick Generate et gestion des questions (écriture base de données)"
          onClick={() => onValueChange("legacy")}
        >
          <span className="sm:hidden">Quick gen. / Questions</span>
          <span className="hidden sm:inline">Quick Generate / Questions</span>
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
