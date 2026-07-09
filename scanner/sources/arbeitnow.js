const API_URL = "https://www.arbeitnow.com/api/job-board-api";

function matchesKeywords(text, keywords) {
  const haystack = text.toLowerCase();
  return keywords.some((k) => haystack.includes(k.toLowerCase()));
}

function isGermanyRelated(job, germanyHints) {
  const location = (job.location || "").toLowerCase();
  if (germanyHints.some((hint) => location.includes(hint))) return true;
  return Boolean(job.remote);
}

export async function fetchArbeitnow(config) {
  const jobs = [];
  let url = API_URL;
  let page = 0;

  while (url && page < config.maxPagesPerSource) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`Arbeitnow API returned ${res.status}`);
    }
    const body = await res.json();
    const data = Array.isArray(body.data) ? body.data : [];

    for (const item of data) {
      const haystack = `${item.title || ""} ${item.description || ""} ${(item.tags || []).join(" ")}`;
      if (!matchesKeywords(haystack, config.keywords)) continue;
      if (!isGermanyRelated(item, config.germanyHints)) continue;

      jobs.push({
        source: "arbeitnow",
        title: item.title || "Untitled",
        company: item.company_name || "Unknown",
        location: item.location || (item.remote ? "Remote" : "Unspecified"),
        remote: Boolean(item.remote),
        url: item.url || "",
        postedAt: item.created_at ? new Date(item.created_at * 1000).toISOString() : null,
        description: item.description || ""
      });
    }

    url = body.links && body.links.next ? body.links.next : null;
    page += 1;
  }

  return jobs;
}
