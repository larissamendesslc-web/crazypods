import { queryOptions } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { saveSettingsPatch } from "@/lib/settings";
import {
  readCommerceCatalog,
  validateCatalog,
  type CommerceCatalog,
} from "@/lib/commerce-model";

// This is a versioned catalog staging repository. Production checkout
// will be powered by the normalized commerce tables and server-side pricing.
// The original niche catalog and its orders are never imported into this one.
export const commerceSettingsKey = import.meta.env["VITE_CRAZY_SEASONS_PREVIEW"] === "1"
  ? "commerce_catalog_preview_v1" : "commerce_catalog_v1";

export const commerceCatalogQuery = queryOptions({
  queryKey: ["commerce-catalog", commerceSettingsKey],
  staleTime: 15_000,
  refetchInterval: 30_000,
  retry: false,
  queryFn: async (): Promise<CommerceCatalog> => {
    const { data, error } = await supabase.from("site_settings")
      .select("data").eq("id", 1).maybeSingle();
    if (error) throw error;
    const settings = data?.data;
    const raw = settings && typeof settings === "object" && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)[commerceSettingsKey] : undefined;
    return readCommerceCatalog(raw);
  },
});

export async function saveCommerceCatalog(draft: CommerceCatalog) {
  const invalid = validateCatalog(draft);
  if (invalid) throw new Error(invalid);
  // This is an admin-authenticated operation governed by existing site_settings RLS.
  // It preserves unrelated settings and the separately versioned delivery module.
  const payload = JSON.parse(JSON.stringify(draft)) as Json;
  return saveSettingsPatch({ [commerceSettingsKey]: payload });
}
