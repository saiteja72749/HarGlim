const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SOURCE_DIRS = ["app", "components", "lib", "context", "hooks", "store"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const backendBase = "https://harglimpublish-backend.onrender.com/api";

function walk(dir, files = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return files;

  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const full = path.join(abs, entry.name);
    if (entry.isDirectory()) {
      walk(path.relative(ROOT, full), files);
    } else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
}

function stripQuery(route) {
  return route.replace(/\?.*$/, "");
}

function normalizeRoute(route) {
  return stripQuery(route)
    .replace(/^\$\{API_URL}/, "")
    .replace(/^https?:\/\/[^/]+\/api/, "")
    .replace(/^\/api/, "")
    .replace(/\$\{[^}]+}/g, "{param}")
    .replace(/:([A-Za-z0-9_]+)/g, "{param}")
    .replace(/{[^}]+}/g, "{param}")
    .replace(/\/+/g, "/");
}

function key(method, route) {
  return `${method.toUpperCase()} ${normalizeRoute(route)}`;
}

function extractFrontendCalls() {
  const calls = [];
  const files = SOURCE_DIRS.flatMap((dir) => walk(dir));

  const apiRegex = /\bapi\.(get|post|put|patch|delete)\(\s*([`'"])([\s\S]*?)\2/g;
  const axiosRegex = /\baxios\.(get|post|put|patch|delete)\(\s*([`'"])([\s\S]*?)\2/g;
  const fetchRegex = /\bfetch\(\s*([`'"])([\s\S]*?)\1\s*(?:,\s*\{([\s\S]*?)\})?/g;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lineStarts = [0];
    for (let i = 0; i < content.length; i += 1) {
      if (content[i] === "\n") lineStarts.push(i + 1);
    }
    const lineForIndex = (index) => {
      let lo = 0;
      let hi = lineStarts.length - 1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (lineStarts[mid] <= index) lo = mid + 1;
        else hi = mid - 1;
      }
      return hi + 1;
    };

    for (const regex of [apiRegex, axiosRegex]) {
      let match;
      while ((match = regex.exec(content))) {
        const route = match[3];
        if (!route.includes("/")) continue;
        calls.push({
          method: match[1].toUpperCase(),
          route,
          normalized: normalizeRoute(route),
          client: match[0].startsWith("axios.") ? "axios" : "api",
          file: rel(file),
          line: lineForIndex(match.index),
        });
      }
    }

    let fetchMatch;
    while ((fetchMatch = fetchRegex.exec(content))) {
      const route = fetchMatch[2];
      if (!route.includes("/")) continue;
      const init = fetchMatch[3] || "";
      const methodMatch = init.match(/method\s*:\s*([`'"])([A-Za-z]+)\1/i);
      calls.push({
        method: (methodMatch ? methodMatch[2] : "GET").toUpperCase(),
        route,
        normalized: normalizeRoute(route),
        client: "fetch",
        file: rel(file),
        line: lineForIndex(fetchMatch.index),
      });
    }
  }

  return calls.sort((a, b) =>
    `${a.file}:${a.line}:${a.method}:${a.route}`.localeCompare(`${b.file}:${b.line}:${b.method}:${b.route}`)
  );
}

function extractDetailedApiRoutes() {
  const file = path.join(ROOT, "fulldetailedapi.md");
  if (!fs.existsSync(file)) return new Map();

  const routes = new Map();
  let currentPath = "";
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    const routeMatch = line.match(/"(?<route>\/api\/[^"]+)"\s*:\s*\{/);
    if (routeMatch) {
      currentPath = routeMatch.groups.route;
      return;
    }

    const methodMatch = line.match(/"(?<method>get|post|put|patch|delete)"\s*:\s*\{/i);
    if (currentPath && methodMatch) {
      const method = methodMatch.groups.method.toUpperCase();
      routes.set(key(method, currentPath), {
        method,
        route: currentPath.replace(/^\/api/, ""),
        source: `fulldetailedapi.md:${index + 1}`,
      });
    }
  });

  return routes;
}

function extractHandoverRoutes() {
  const files = ["HM_BACKEND_COMPLETE_HANDOVER (1).md", "BACKEND_INTEGRATION_GUIDE.md"];
  const routes = new Map();

  for (const name of files) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const tableMatch = line.match(/\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`?(\/api\/[^`|\s]+)`?/i);
      const inlineMatch = line.match(/`(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[^`]+)`/i);
      const arrowMatch = line.match(/->\s*(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/\S+)/i);
      const pair = tableMatch
        ? [tableMatch[1], tableMatch[2]]
        : inlineMatch
          ? [inlineMatch[1], inlineMatch[2]]
          : arrowMatch
            ? [arrowMatch[1], arrowMatch[2]]
            : null;
      if (!pair) return;
      const [method, route] = pair;
      routes.set(key(method, route), {
        method: method.toUpperCase(),
        route: route.replace(/^\/api/, ""),
        source: `${name}:${index + 1}`,
      });
    });
  }

  return routes;
}

const explicitUnsupported = new Map([
  ["GET /faqs", "Backend report: use GET /content and read data.faq."],
  ["GET /orders", "Backend report: global customer order list is not exposed."],
  ["GET /invoices", "Backend report: use /admin/invoices."],
  ["GET /publish-requests", "Backend report: no public/user list route for publish requests."],
  ["GET /authors/me/publish-requests", "Backend report: wrong path; use /authors/me/books."],
  ["GET /authors/me/manuscripts", "Backend report: wrong path; use /authors/me/books."],
  ["DELETE /authors/me/manuscripts/{param}", "Backend report: use /authors/me/books/:bookId."],
  ["DELETE /publish-requests/{param}", "Backend report: public delete route unsupported."],
]);

const explicitSupported = new Map([
  ["POST /contact", "Backend update: contact form API is supported."],
  ["POST /contact-requests", "Backend update: contact request alias is supported."],
  ["GET /users/me/orders", "Backend report: supported reader order route."],
  ["GET /users", "Live probe: route exists and returns 401 without token."],
  ["GET /reviews", "Live probe: route exists and returns 401 without token."],
  ["GET /admin/stats", "Live probe: route exists and returns 401 without token."],
  ["GET /author-applications/me", "Backend update: author application status alias is supported."],
  ["PUT /users/me", "Backend update: profile update alias is supported."],
  ["PATCH /users/me", "Backend update: profile update alias is supported."],
  ["PUT /auth/me", "Backend update: profile update alias is supported."],
  ["GET /admin/books/{param}", "Backend update: all latest frontend audit endpoints are supported."],
  ["POST /admin/users", "Backend update: all latest frontend audit endpoints are supported."],
  ["PATCH /admin/users/{param}", "Backend update: all latest frontend audit endpoints are supported."],
  ["DELETE /admin/users/{param}", "Backend update: all latest frontend audit endpoints are supported."],
  ["PUT /admin/users/{param}/status", "Backend update: all latest frontend audit endpoints are supported."],
  ["PUT /authors/{param}", "Backend update: all latest frontend audit endpoints are supported."],
  ["GET /users/{param}", "Backend update: all latest frontend audit endpoints are supported."],
]);

function classify(call, routeMaps) {
  const callKey = key(call.method, call.route);
  const unsupportedReason = explicitUnsupported.get(callKey);
  if (unsupportedReason) {
    return { status: "NOT_CONNECTED", source: "", note: unsupportedReason };
  }

  const supportedReason = explicitSupported.get(callKey);
  if (supportedReason) {
    return { status: "CONNECTED", source: "backend report/live probe", note: supportedReason };
  }

  for (const routes of routeMaps) {
    const match = routes.get(callKey);
    if (match) {
      return { status: "CONNECTED", source: match.source, note: "" };
    }
  }

  return {
    status: "REVIEW_NEEDED",
    source: "",
    note: "No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route.",
  };
}

function makeMarkdown(calls, detailedRoutes, handoverRoutes) {
  const routeMaps = [detailedRoutes, handoverRoutes];
  const rows = calls.map((call, index) => ({
    index: index + 1,
    ...call,
    ...classify(call, routeMaps),
  }));

  const counts = rows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { CONNECTED: 0, NOT_CONNECTED: 0, REVIEW_NEEDED: 0 }
  );

  const unique = new Map();
  rows.forEach((row) => {
    const uniqueKey = `${row.method} ${row.normalized}`;
    if (!unique.has(uniqueKey)) unique.set(uniqueKey, row.status);
  });
  const uniqueCounts = [...unique.values()].reduce(
    (acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { CONNECTED: 0, NOT_CONNECTED: 0, REVIEW_NEEDED: 0 }
  );

  const lines = [];
  lines.push("# Frontend API Connectivity Audit");
  lines.push("");
  lines.push(`Backend base: \`${backendBase}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Frontend call sites: ${rows.length}`);
  lines.push(`- Unique normalized frontend endpoints: ${unique.size}`);
  lines.push(`- Connected call sites: ${counts.CONNECTED || 0}`);
  lines.push(`- Not connected call sites: ${counts.NOT_CONNECTED || 0}`);
  lines.push(`- Review-needed call sites: ${counts.REVIEW_NEEDED || 0}`);
  lines.push(`- Connected unique endpoints: ${uniqueCounts.CONNECTED || 0}`);
  lines.push(`- Not connected unique endpoints: ${uniqueCounts.NOT_CONNECTED || 0}`);
  lines.push(`- Review-needed unique endpoints: ${uniqueCounts.REVIEW_NEEDED || 0}`);
  lines.push("");
  lines.push("## Status Meaning");
  lines.push("");
  lines.push("- `CONNECTED`: exact normalized method/path found in `fulldetailedapi.md` or backend handover docs.");
  lines.push("- `NOT_CONNECTED`: known unsupported frontend call from backend report.");
  lines.push("- `REVIEW_NEEDED`: no exact docs match found by parser; this may be a legacy fallback, undocumented deployed route, or parser miss.");
  lines.push("");
  lines.push("## Full Call-Site List");
  lines.push("");
  lines.push("| # | Status | Method | Frontend Route | Normalized Route | Client | Source | Backend Doc Source | Note |");
  lines.push("|---:|---|---|---|---|---|---|---|---|");
  for (const row of rows) {
    lines.push(
      `| ${row.index} | ${row.status} | ${row.method} | \`${row.route.replaceAll("|", "\\|")}\` | \`${row.normalized}\` | ${row.client} | \`${row.file}:${row.line}\` | ${row.source || ""} | ${row.note.replaceAll("|", "\\|")} |`
    );
  }

  lines.push("");
  lines.push("## Backend Request/Response Reference");
  lines.push("");
  lines.push("- Canonical request and response examples live in `fulldetailedapi.md` at the `Backend Doc Source` line shown above.");
  lines.push("- Additional route confirmations and workflow notes live in `HM_BACKEND_COMPLETE_HANDOVER (1).md` and `BACKEND_INTEGRATION_GUIDE.md`.");
  lines.push("- Protected routes returning `401` without a token are considered connected if documented; send `Authorization: Bearer <token>`.");

  return { markdown: lines.join("\n"), rows, counts, uniqueCounts };
}

const calls = extractFrontendCalls();
const detailedRoutes = extractDetailedApiRoutes();
const handoverRoutes = extractHandoverRoutes();
const report = makeMarkdown(calls, detailedRoutes, handoverRoutes);

const outDir = path.join(ROOT, "api-audit");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "frontend-backend-api-audit.md"), report.markdown);
fs.writeFileSync(
  path.join(outDir, "frontend-backend-api-audit.json"),
  JSON.stringify(
    {
      backendBase,
      generatedAt: new Date().toISOString(),
      totalCallSites: report.rows.length,
      counts: report.counts,
      uniqueCounts: report.uniqueCounts,
      rows: report.rows,
    },
    null,
    2
  )
);

console.log(
  JSON.stringify(
    {
      report: "api-audit/frontend-backend-api-audit.md",
      json: "api-audit/frontend-backend-api-audit.json",
      totalCallSites: report.rows.length,
      counts: report.counts,
      uniqueCounts: report.uniqueCounts,
    },
    null,
    2
  )
);
