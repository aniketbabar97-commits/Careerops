function buildUrl(country, page, appId, appKey, what) {
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", "50");
  url.searchParams.set("what", what);
  url.searchParams.set("content-type", "application/json");
  return url.toString();
}

export async function fetchAdzuna(config) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.warn("[adzuna] Skipped: ADZUNA_APP_ID / ADZUNA_APP_KEY not set.");
    return [];
  }

  const jobs = [];
  const seen = new Set();

  for (const keyword of config.keywords) {
    for (let page = 1; page <= Math.min(config.maxPagesPerSource, 3); page += 1) {
      const res = await fetch(buildUrl(config.adzunaCountry, page, appId, appKey, keyword));
      if (!res.ok) {
        console.warn(`[adzuna] "${keyword}" page ${page} returned ${res.status}`);
        break;
      }
      const body = await res.json();
      const results = Array.isArray(body.results) ? body.results : [];
      if (results.length === 0) break;

      for (const item of results) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);

        jobs.push({
          source: "adzuna",
          title: item.title || "Untitled",
          company: item.company && item.company.display_name ? item.company.display_name : "Unknown",
          location: item.location && item.location.display_name ? item.location.display_name : "Unspecified",
          remote: false,
          url: item.redirect_url || "",
          postedAt: item.created || null,
          description: item.description || ""
        });
      }
    }
  }

  return jobs;
}
