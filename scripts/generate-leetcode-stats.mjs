import { writeFile } from "node:fs/promises";

const username = "Moinaktar";
const endpoint = "https://leetcode.com/graphql";

const query = `
query LeetCodeProfile($username: String!, $year: Int) {
  matchedUser(username: $username) {
    username
    submitStats: submitStatsGlobal {
      acSubmissionNum { difficulty count }
    }
    userCalendar(year: $year) {
      streak
      totalActiveDays
      submissionCalendar
    }
    tagProblemCounts {
      advanced { tagName problemsSolved }
      intermediate { tagName problemsSolved }
      fundamental { tagName problemsSolved }
    }
  }
}`;

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": "https://leetcode.com",
  "Referer": `https://leetcode.com/u/${username}/`,
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36"
};

async function fetchLeetCode() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          operationName: "LeetCodeProfile",
          variables: { username, year: new Date().getUTCFullYear() },
          query
        })
      });

      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);

      const body = JSON.parse(text);
      if (body.errors?.length) throw new Error(body.errors.map(e => e.message).join("; "));
      if (!body.data?.matchedUser) throw new Error(`Public profile not found: ${username}`);

      return body.data.matchedUser;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
  throw lastError;
}

const user = await fetchLeetCode();

const solved = Object.fromEntries(
  (user.submitStats?.acSubmissionNum ?? []).map(x => [x.difficulty, Number(x.count)])
);

const total = solved.All ?? (solved.Easy ?? 0) + (solved.Medium ?? 0) + (solved.Hard ?? 0);
const easy = solved.Easy ?? 0;
const medium = solved.Medium ?? 0;
const hard = solved.Hard ?? 0;
const streak = user.userCalendar?.streak ?? null;

const topics = [
  ...(user.tagProblemCounts?.advanced ?? []),
  ...(user.tagProblemCounts?.intermediate ?? []),
  ...(user.tagProblemCounts?.fundamental ?? [])
]
  .filter(x => Number(x.problemsSolved) > 0)
  .sort((a, b) => Number(b.problemsSolved) - Number(a.problemsSolved))
  .slice(0, 3);

const max = Math.max(easy, medium, hard, 1);
const esc = s => String(s).replace(/[<>&'"]/g, c => ({
  "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '"':"&quot;"
}[c]));

const bar = (label, value, y, fill) => `
  <text x="66" y="${y}" class="small">${label}</text>
  <text x="720" y="${y}" text-anchor="end" class="num">${value}</text>
  <rect x="66" y="${y + 12}" width="628" height="8" rx="4" fill="#1A1E23"/>
  <rect x="66" y="${y + 12}" width="${Math.round(628 * value / max)}" height="8" rx="4" fill="${fill}"/>
`;

const topicWidths = topics.map(t => Math.min(150, Math.max(88, 24 + t.tagName.length * 7)));
let tx = 804;
const topicSvg = topics.map((t, i) => {
  const w = topicWidths[i];
  if (tx + w > 1134) return "";
  const out = `
    <rect x="${tx}" y="338" width="${w}" height="28" rx="14" fill="#12151A" stroke="#6F5B38"/>
    <text x="${tx + w/2}" y="356" text-anchor="middle" class="topic">${esc(t.tagName.toUpperCase())}</text>`;
  tx += w + 10;
  return out;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="430" viewBox="0 0 1200 430" role="img" aria-label="LeetCode activity for ${esc(username)}">
<defs>
  <linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#8F7A4E"/><stop offset="1" stop-color="#B8A06A"/></linearGradient>
  <style>
    .bg{fill:#05070A}.panel{fill:#0B0E13;stroke:#1A1E23;stroke-width:1}
    .title{font:600 22px Arial,sans-serif;letter-spacing:4px;fill:#F2EFE7}
    .label{font:600 11px Arial,sans-serif;letter-spacing:2px;fill:#8C8574}
    .num{font:600 28px Arial,sans-serif;fill:#F2EFE7}
    .small{font:500 12px Arial,sans-serif;fill:#A69F91}
    .topic{font:600 10px Arial,sans-serif;fill:#D9D4C7;letter-spacing:1px}
  </style>
</defs>
<rect class="bg" width="1200" height="430" rx="10"/>
<text x="42" y="43" class="title">LEETCODE ACTIVITY</text>
<text x="1158" y="42" text-anchor="end" class="label">MOINAKTAR / 02</text>
<line x1="42" y1="62" x2="1158" y2="62" stroke="#1A1E23"/>
<rect class="panel" x="42" y="86" width="264" height="92" rx="6"/><text x="64" y="113" class="label">TOTAL SOLVED</text><text x="64" y="151" class="num">${total}</text>
<rect class="panel" x="322" y="86" width="264" height="92" rx="6"/><text x="344" y="113" class="label">EASY</text><text x="344" y="151" class="num">${easy}</text>
<rect class="panel" x="602" y="86" width="264" height="92" rx="6"/><text x="624" y="113" class="label">MEDIUM</text><text x="624" y="151" class="num">${medium}</text>
<rect class="panel" x="882" y="86" width="276" height="92" rx="6"/><text x="904" y="113" class="label">HARD</text><text x="904" y="151" class="num">${hard}</text>
<rect class="panel" x="42" y="198" width="716" height="188" rx="6"/><text x="66" y="228" class="label">DIFFICULTY DISTRIBUTION</text>
${bar("EASY", easy, 266, "#B8A06A")}
${bar("MEDIUM", medium, 314, "#C4BCA8")}
${bar("HARD", hard, 362, "#6F5B38")}
<rect class="panel" x="780" y="198" width="378" height="188" rx="6"/><text x="804" y="228" class="label">CURRENT STREAK</text>
<text x="804" y="270" class="num">${streak == null ? "—" : streak + " DAYS"}</text>
<line x1="804" y1="292" x2="1134" y2="292" stroke="#1A1E23"/>
<text x="804" y="319" class="label">MOST TOUCHED TOPICS</text>
${topicSvg}
<text x="42" y="414" class="label">ALGORITHM • PROBLEM SOLVING • CONSISTENCY</text>
</svg>`;

await writeFile("assets/moinaktar_leetcode_activity_animated.svg", svg, "utf8");
console.log(JSON.stringify({ username, total, easy, medium, hard, streak, topics }, null, 2));
