export function scoreJob(job, profile) {
  const haystack = `${job.title} ${job.description}`.toLowerCase();
  let score = 0;
  const matched = [];

  for (const skill of profile.skills) {
    if (haystack.includes(skill.toLowerCase())) {
      score += 1;
      matched.push(skill);
    }
  }

  const titleHit = /hybris|sap commerce|sap cx/i.test(job.title);
  if (titleHit) score += 3;

  return { score, matchedSkills: matched };
}
