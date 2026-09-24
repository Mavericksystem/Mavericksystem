const fs = require("node:fs/promises");
const token = process.env.GITHUB_TOKEN;
const username = process.env.GITHUB_USERNAME || "Mavericksystem";
if (!token) throw new Error("GITHUB_TOKEN is required");

const query = \`
query($login: String!) {
  user(login: $login) {
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      totalCount
      nodes { stargazerCount primaryLanguage { name } }
    }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}\`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { authorization: "bearer " + token, "content-type": "application/json", "user-agent": "moinaktar-profile-stats" },
  body: JSON.stringify({ query, variables: { login: username } })
});
if (!res.ok) throw new Error("GitHub GraphQL HTTP " + res.status);
const body = await res.json();
if (body.errors?.length) throw new Error(body.errors.map(e => e.message).join("; "));
const user = body.data.user;
if (!user) throw new Error("GitHub user not found: " + username);

const repos = user.repositories.nodes;
const stars = repos.reduce((s, r) => s + r.stargazerCount, 0);
const languageCounts = {};
for (const r of repos) if (r.primaryLanguage?.name) languageCounts[r.primaryLanguage.name] = (languageCounts[r.primaryLanguage.name] || 0) + 1;
const languages = Object.entries(languageCounts).sort((a,b)=>b[1]-a[1]).slice(0,4);

const days = user.contributionsCollection.contributionCalendar.weeks.flatMap(w=>w.contributionDays).sort((a,b)=>a.date.localeCompare(b.date));
let streak = 0;
for (let i=days.length-1;i>=0;i--) { if (days[i].contributionCount>0) streak++; else if(i!==days.length-1) break; }

const recent = days.slice(-30), max = Math.max(1,...recent.map(d=>d.contributionCount));
const pts = recent.map((d,i)=>[70+715*i/Math.max(1,recent.length-1),350-120*d.contributionCount/max]);
let line = "M " + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i],cx=(x0+x1)/2;line += " C "+cx.toFixed(1)+" "+y0.toFixed(1)+" "+cx.toFixed(1)+" "+y1.toFixed(1)+" "+x1.toFixed(1)+" "+y1.toFixed(1);}

const esc = s => String(s).replace(/[<>&'"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]));
const colors=["#35d0b0","#69e6c6","#9beed9","#b9f5e7"], maxLang=Math.max(1,...languages.map(([,n])=>n));
const langRows=languages.map(([name,n],i)=>{const y=252+i*40,w=Math.max(25,Math.round(190*n/maxLang));return '<text x="855" y="'+y+'" class="s">'+esc(name)+'</text><rect x="855" y="'+(y+8)+'" width="235" height="7" rx="4" fill="#21363d"/><rect x="855" y="'+(y+8)+'" width="0" height="7" rx="4" fill="'+colors[i]+'"><animate attributeName="width" values="0;'+w+';'+w+'" dur="1.4s" repeatCount="indefinite" begin="'+(i*.2)+'s"/></rect>';}).join("");

const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="430" viewBox="0 0 1200 430" role="img" aria-label="GitHub activity for '+esc(username)+'"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#10232b"/><stop offset="1" stop-color="#3E606F"/></linearGradient><linearGradient id="chart" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#35d0b0" stop-opacity=".03"/><stop offset="1" stop-color="#35d0b0" stop-opacity=".38"/></linearGradient><style>.h{font:700 25px Georgia,serif;fill:#FCFFF5;letter-spacing:3px}.n{font:700 30px Arial,sans-serif;fill:#FCFFF5}.l{font:500 11px Arial,sans-serif;fill:#a9c0c8;letter-spacing:2px}.s{font:11px Arial,sans-serif;fill:#8faab4}</style></defs><rect width="1200" height="430" rx="22" fill="url(#bg)"/><rect x="1" y="1" width="1198" height="428" rx="21" fill="none" stroke="#FCFFF5" stroke-opacity=".12"/><text x="55" y="55" class="h">GITHUB ACTIVITY</text><circle cx="1070" cy="48" r="4" fill="#35d0b0"><animate attributeName="opacity" values=".2;1;.2" dur="1.8s" repeatCount="indefinite"/></circle><text x="1085" y="53" class="s">LIVE</text><g fill="#07151b" fill-opacity=".32" stroke="#FCFFF5" stroke-opacity=".10"><rect x="45" y="82" width="245" height="82" rx="14"/><rect x="305" y="82" width="245" height="82" rx="14"/><rect x="565" y="82" width="245" height="82" rx="14"/><rect x="825" y="82" width="330" height="82" rx="14"/></g><text x="68" y="113" class="l">CONTRIBUTIONS</text><text x="68" y="148" class="n">'+user.contributionsCollection.contributionCalendar.totalContributions.toLocaleString()+'</text><text x="328" y="113" class="l">REPOSITORIES</text><text x="328" y="148" class="n">'+user.repositories.totalCount+'</text><text x="588" y="113" class="l">STARS</text><text x="588" y="148" class="n">'+stars.toLocaleString()+'</text><text x="848" y="113" class="l">CURRENT STREAK</text><text x="848" y="148" class="n">'+streak+' DAYS</text><rect x="45" y="190" width="765" height="195" rx="16" fill="#07151b" fill-opacity=".25" stroke="#FCFFF5" stroke-opacity=".10"/><text x="70" y="218" class="l">CONTRIBUTION FLOW · LAST 30 DAYS</text><g stroke="#FCFFF5" stroke-opacity=".07"><line x1="70" y1="245" x2="785" y2="245"/><line x1="70" y1="285" x2="785" y2="285"/><line x1="70" y1="325" x2="785" y2="325"/><line x1="70" y1="365" x2="785" y2="365"/></g><path d="'+line+' L785 365 L70 365Z" fill="url(#chart)"/><path d="'+line+'" fill="none" stroke="#35d0b0" stroke-width="3" stroke-linecap="round" stroke-dasharray="1200" stroke-dashoffset="1200"><animate attributeName="stroke-dashoffset" from="1200" to="0" dur="2.8s" repeatCount="indefinite"/></path><rect x="830" y="190" width="325" height="195" rx="16" fill="#07151b" fill-opacity=".25" stroke="#FCFFF5" stroke-opacity=".10"/><text x="855" y="218" class="l">LANGUAGES</text>'+langRows+'</svg>';

await fs.writeFile("assets/moinaktar_github_activity_animated.svg", svg, "utf8");