import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchArbeitnow } from "./sources/arbeitnow.js";
import { fetchAdzuna } from "./sources/adzuna.js";
import { scoreJob } from "./score.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SOURCES = [
  { name: "arbeitnow", fn: fetchArbeitnow },
  { name: "adzuna", fn: fetchAdzuna }
];

function dedupeKey(job) {
  if (job.url) return job.url.split("?")[0];
  return `${job.title}::${job.company}`.toLowerCase();
}

function toMarkdownTable(jobs) {
  const header = "| Score | Title | Company | Location | Source | Posted | Link |\n|---|---|---|---|---|---|---|";
  const rows = jobs.map((j) => {
    const posted = j.postedAt ? j.postedAt.slice(0, 10) : "n/a";
    const title = j.title.replace(/\|/g, "-");
    const company = j.company.replace(/\|/g, "-");
    return `| ${j.score} | ${title} | ${company} | ${j.location} | ${j.source} | ${posted} | [Apply](${j.url}) |`;
  });
  return [header, ...rows].join("\n");
}

async function main() {
  const config = JSON.parse(await readFile(path.join(ROOT, "config/search.json"), "utf-8"));
  const profile = JSON.parse(await readFile(path.join(ROOT, "config/profile.json"), "utf-8"));

  const results = await Promise.allSettled(SOURCES.map((s) => s.fn(config)));

  const allJobs = [];
  const sourceSummary = [];

  results.forEach((r, i) => {
    const name = SOURCES[i].name;
    if (r.status === "fulfilled") {
      sourceSummary.push(`${name}: ${r.value.length} matches`);
      allJobs.push(...r.value);
    } else {
      sourceSummary.push(`${name}: FAILED (${r.reason.message})`);
      console.error(`[${name}] error:`, r.reason);
    }
  });

  const seen = new Map();
  for (const job of allJobs) {
    const key = dedupeKey(job);
    if (!seen.has(key)) seen.set(key, job);
  }

  const scored = [...seen.values()].map((job) => {
    const { score, matchedSkills } = scoreJob(job, profile);
    return { ...job, score, matchedSkills };
  });

  scored.sort((a, b) => b.score - a.score);

  const now = new Date().toISOString();

  await mkdir(path.join(ROOT, "data"), { recursive: true });
  await mkdir(path.join(ROOT, "reports"), { recursive: true });

  await writeFile(
    path.join(ROOT, "data/jobs.json"),
    JSON.stringify({ scannedAt: now, count: scored.length, jobs: scored }, null, 2)
  );

  const md = [
    `# Job Scan Report`,
    ``,
    `Scanned: ${now}`,
    `Location: ${config.locationLabel}`,
    `Keywords: ${config.keywords.join(", ")}`,
    `Total unique matches: ${scored.length}`,
    ``,
    `Sources: ${sourceSummary.join(" | ")}`,
    ``,
    toMarkdownTable(scored)
  ].join("\n");

  await writeFile(path.join(ROOT, "reports/latest.md"), md + "\n");

  console.log(`Scan complete. ${scored.length} unique matches written to reports/latest.md`);
  console.log(sourceSummary.join("\n"));
}

main().catch((err) => {
  console.error("Scan failed:", err);
  process.exit(1);
});
