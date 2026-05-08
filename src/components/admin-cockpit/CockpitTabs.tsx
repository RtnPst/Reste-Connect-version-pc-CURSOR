import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CockpitTabId } from "@/lib/admin-cockpit/loadSnapshot";

type Props = {
  value: CockpitTabId;
  onValueChange: (next: CockpitTabId) => void;
};

export function CockpitTabs({ value, onValueChange }: Props) {
  return (
    <div className="overflow-x-auto">
      <TabsList className="inline-flex h-auto min-w-max gap-1 rounded-xl bg-muted/70 p-1">
        <TabsTrigger
          value="overview"
          className="rounded-lg px-3 py-1.5 text-xs sm:text-sm"
          data-state={value === "overview" ? "active" : "inactive"}
          onClick={() => onValueChange("overview")}
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="legacy"
          className="rounded-lg px-3 py-1.5 text-xs sm:text-sm"
          data-state={value === "legacy" ? "active" : "inactive"}
          onClick={() => onValueChange("legacy")}
        >
          Existing Admin / Legacy
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
