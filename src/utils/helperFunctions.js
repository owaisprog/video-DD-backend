export const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const normalizeTags = (tags = []) => [
  ...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)),
];

export const tokenizeTags = (tags = []) => {
  const tokens = [];
  for (const t of tags) {
    const words = String(t)
      .toLowerCase()
      .trim()
      .split(/[\s,._-]+/g) // split by spaces/punct
      .filter((w) => w.length >= 2);
    tokens.push(...words);
  }
  return [...new Set(tokens)];
};

export const progressKey = (videoId) => `progress:video:${videoId}`;
