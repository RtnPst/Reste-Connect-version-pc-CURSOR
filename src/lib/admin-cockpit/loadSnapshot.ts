export type CockpitTabId = "overview" | "legacy";

export type AdminCockpitMeta = {
  schema_version: string;
  generated_at: string;
  sources: Array<{
    key: string;
    path: string;
    exists: boolean;
    row_count: number | null;
    mtime: string | null;
  }>;
  warnings: Array<{
    code: string;
    key?: string;
    path?: string;
  }>;
};

export type AdminCockpitOverview = {
  generated_at: string;
  kpis: Record<string, number | boolean>;
  alerts?: Array<{
    source: string;
    item: string;
    severity: string;
    reason: string;
  }>;
};

export const EMPTY_META: AdminCockpitMeta = {
  schema_version: "admin_cockpit_snapshot_v1",
  generated_at: "",
  sources: [],
  warnings: [],
};

export const EMPTY_OVERVIEW: AdminCockpitOverview = {
  generated_at: "",
  kpis: {},
  alerts: [],
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(path, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`snapshot_fetch_failed:${path}:${res.status}`);
  return res.json();
}

export async function loadMetaSnapshot(): Promise<{
  data: AdminCockpitMeta;
  warning: string | null;
}> {
  try {
    const raw = await fetchJson("/admin-cockpit/meta.json");
    if (!isPlainObject(raw)) return { data: EMPTY_META, warning: "meta_invalid_shape" };
    const sources = Array.isArray(raw.sources)
      ? raw.sources.filter(isPlainObject).map((s) => ({
          key: String(s.key ?? ""),
          path: String(s.path ?? ""),
          exists: Boolean(s.exists),
          row_count: typeof s.row_count === "number" ? s.row_count : null,
          mtime: typeof s.mtime === "string" ? s.mtime : null,
        }))
      : [];
    const warnings = Array.isArray(raw.warnings)
      ? raw.warnings.filter(isPlainObject).map((w) => ({
          code: String(w.code ?? ""),
          key: typeof w.key === "string" ? w.key : undefined,
          path: typeof w.path === "string" ? w.path : undefined,
        }))
      : [];
    return {
      data: {
        schema_version: String(raw.schema_version ?? "admin_cockpit_snapshot_v1"),
        generated_at: String(raw.generated_at ?? ""),
        sources,
        warnings,
      },
      warning: null,
    };
  } catch (err) {
    return {
      data: EMPTY_META,
      warning: err instanceof Error ? err.message : "meta_unavailable",
    };
  }
}

export async function loadOverviewSnapshot(): Promise<{
  data: AdminCockpitOverview;
  warning: string | null;
}> {
  try {
    const raw = await fetchJson("/admin-cockpit/overview.json");
    if (!isPlainObject(raw)) return { data: EMPTY_OVERVIEW, warning: "overview_invalid_shape" };
    const kpis = isPlainObject(raw.kpis)
      ? Object.fromEntries(
          Object.entries(raw.kpis).filter(
            ([, v]) => typeof v === "number" || typeof v === "boolean",
          ),
        )
      : {};
    const alerts = Array.isArray(raw.alerts)
      ? raw.alerts
          .filter(isPlainObject)
          .map((a) => ({
            source: String(a.source ?? ""),
            item: String(a.item ?? ""),
            severity: String(a.severity ?? ""),
            reason: String(a.reason ?? ""),
          }))
      : [];
    return {
      data: {
        generated_at: String(raw.generated_at ?? ""),
        kpis,
        alerts,
      },
      warning: null,
    };
  } catch (err) {
    return {
      data: EMPTY_OVERVIEW,
      warning: err instanceof Error ? err.message : "overview_unavailable",
    };
  }
}
