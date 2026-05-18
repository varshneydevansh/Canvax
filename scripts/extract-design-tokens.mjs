import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const exportsRoot = resolve(projectRoot, "exports");
const defaultJsonPath = resolve(
  exportsRoot,
  "canvax-external-design-tokens-latest.json",
);
const defaultMarkdownPath = resolve(
  exportsRoot,
  "canvax-external-design-tokens-latest.md",
);

const args = process.argv.slice(2);
const wantsHelp = args.includes("--help") || args.includes("-h");
const wantsJson = args.includes("--json");
const dryRun = args.includes("--dry-run");

if (wantsHelp) {
  printHelp();
  process.exit(0);
}

const source = await readSource(args);
const tokenPack = buildTokenPack(source);
const markdown = buildTokenMarkdown(tokenPack);

if (!dryRun) {
  await mkdir(exportsRoot, { recursive: true });
  await writeFile(defaultJsonPath, `${JSON.stringify(tokenPack, null, 2)}\n`);
  await writeFile(defaultMarkdownPath, markdown);
}

if (wantsJson) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        jsonPath: dryRun ? "" : toProjectRelative(defaultJsonPath),
        markdownPath: dryRun ? "" : toProjectRelative(defaultMarkdownPath),
        tokenPack,
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    dryRun
      ? `Extracted ${tokenPack.palette.length} colors from ${tokenPack.source.label} (dry run).`
      : `Extracted ${tokenPack.palette.length} colors to ${toProjectRelative(defaultJsonPath)}.`,
  );
}

async function readSource(argv) {
  const inlineText = readOption(argv, "--text");
  if (inlineText) {
    return {
      type: "inline-text",
      label: "Inline CSS/HTML text",
      url: "",
      path: "",
      text: inlineText,
      linkedStylesheets: [],
    };
  }

  const file = readOption(argv, "--file") || readOption(argv, "--css");
  if (file) {
    const path = resolve(projectRoot, file);
    return {
      type: "file",
      label: toProjectRelative(path),
      url: "",
      path: toProjectRelative(path),
      text: await readFile(path, "utf8"),
      linkedStylesheets: [],
    };
  }

  const url = readOption(argv, "--url");
  if (url) {
    return readUrlSource(url);
  }

  throw new Error(
    "Provide --url, --file, --css, or --text. Use --help for examples.",
  );
}

async function readUrlSource(urlText) {
  const url = new URL(urlText);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "CanvaxDesignTokenExtractor/0.1",
    },
  });
  if (!response.ok) {
    throw new Error(`Could not fetch ${url.href}: ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  const linkedStylesheets = [];
  let combined = body;

  if (contentType.includes("text/html") || /<html[\s>]/i.test(body)) {
    const hrefs = extractStylesheetHrefs(body)
      .map((href) => new URL(href, url).href)
      .slice(0, 8);
    for (const href of hrefs) {
      try {
        const cssResponse = await fetch(href, {
          headers: {
            "User-Agent": "CanvaxDesignTokenExtractor/0.1",
          },
        });
        if (!cssResponse.ok) {
          continue;
        }
        const css = await cssResponse.text();
        linkedStylesheets.push({ href, bytes: css.length });
        combined += `\n\n/* linked stylesheet: ${href} */\n${css}`;
      } catch {
        // Linked CSS is best-effort. The page HTML itself may still contain tokens.
      }
    }
  }

  return {
    type: "url",
    label: url.href,
    url: url.href,
    path: "",
    text: combined,
    linkedStylesheets,
  };
}

function buildTokenPack(source) {
  const colors = extractColors(source.text);
  const cssVariables = extractCssVariables(source.text);
  const fonts = extractFonts(source.text);
  const palette = colors.slice(0, 12).map((entry, index) => ({
    hex: entry.hex,
    count: entry.count,
    role: index === 0 ? "primary" : index === 1 ? "accent" : "support",
    examples: entry.examples.slice(0, 4),
  }));

  return {
    schemaVersion: 1,
    kind: "canvax-external-design-tokens",
    createdAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    source: {
      type: source.type,
      label: source.label,
      url: source.url,
      path: source.path,
      linkedStylesheets: source.linkedStylesheets,
    },
    palette,
    cssVariables,
    typography: {
      fontFamilies: fonts.slice(0, 12),
    },
    usage: {
      scannedCharacters: source.text.length,
      colorCount: colors.length,
      cssVariableCount: cssVariables.length,
      fontFamilyCount: fonts.length,
    },
    summary: buildTokenSummary(source, palette, fonts),
    integration: {
      designKitImport: "Use palette as designKit.designTokens.palette.",
      styleLockImport:
        "Use palette, typography, and summary as external context for Canvax style locks.",
      noApiBoundary:
        "This extractor reads local text or public URLs only; it does not call an AI or paid image/API service.",
    },
  };
}

function extractColors(text) {
  const counts = new Map();
  const add = (hex, example) => {
    const normalized = normalizeHex(hex);
    if (!normalized) {
      return;
    }
    const entry = counts.get(normalized) || {
      hex: normalized,
      count: 0,
      examples: [],
    };
    entry.count += 1;
    if (example && entry.examples.length < 8) {
      entry.examples.push(example.trim().slice(0, 120));
    }
    counts.set(normalized, entry);
  };

  for (const match of text.matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi)) {
    add(match[0], contextAround(text, match.index || 0));
  }

  for (const match of text.matchAll(
    /rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*(?:[0-9.]+|var\([^)]+\)))?\s*\)/gi,
  )) {
    const red = clampByte(Number(match[1]));
    const green = clampByte(Number(match[2]));
    const blue = clampByte(Number(match[3]));
    add(rgbToHex(red, green, blue), contextAround(text, match.index || 0));
  }

  return [...counts.values()].sort((a, b) => b.count - a.count);
}

function extractCssVariables(text) {
  const variables = [];
  for (const match of text.matchAll(/(--[a-z0-9-_]+)\s*:\s*([^;{}]+)[;}]/gi)) {
    const name = match[1];
    const value = match[2].trim();
    variables.push({
      name,
      value,
      colors: extractColors(value).map((entry) => entry.hex),
    });
  }
  return dedupeBy(variables, (entry) => `${entry.name}:${entry.value}`).slice(
    0,
    80,
  );
}

function extractFonts(text) {
  const fonts = [];
  for (const match of text.matchAll(/font-family\s*:\s*([^;{}]+)/gi)) {
    fonts.push(cleanFontValue(match[1]));
  }
  return [...new Set(fonts.filter(Boolean))].slice(0, 24);
}

function extractStylesheetHrefs(html) {
  return [...html.matchAll(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi)]
    .map((match) => match[0].match(/\bhref=["']([^"']+)["']/i)?.[1])
    .filter(Boolean);
}

function buildTokenSummary(source, palette, fonts) {
  const colorSummary = palette.length
    ? `Top colors: ${palette.slice(0, 5).map((entry) => entry.hex).join(", ")}`
    : "No explicit colors found";
  const fontSummary = fonts.length
    ? `Fonts: ${fonts.slice(0, 3).join(" | ")}`
    : "No font-family rules found";
  return `${source.type} source: ${source.label}. ${colorSummary}. ${fontSummary}.`;
}

function buildTokenMarkdown(pack) {
  const lines = [
    "# Canvax External Design Tokens",
    "",
    `- Source: ${pack.source.label}`,
    `- Requires OpenAI API key: ${pack.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Colors: ${pack.palette.length}`,
    `- CSS variables: ${pack.cssVariables.length}`,
    `- Font families: ${pack.typography.fontFamilies.length}`,
    "",
    "## Summary",
    "",
    pack.summary,
    "",
    "## Palette",
    "",
    ...pack.palette.map(
      (entry) => `- ${entry.hex} (${entry.role}, ${entry.count} occurrence${entry.count === 1 ? "" : "s"})`,
    ),
    "",
    "## Typography",
    "",
    ...(pack.typography.fontFamilies.length
      ? pack.typography.fontFamilies.map((font) => `- ${font}`)
      : ["- Not detected"]),
    "",
    "## Import Notes",
    "",
    "- Import `palette` into `designKit.designTokens.palette` when this source should shape Canvax output.",
    "- Keep this as a reference artifact; do not treat extraction as a full design-system audit.",
  ];
  return `${lines.join("\n")}\n`;
}

function readOption(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) {
    return "";
  }
  return argv[index + 1] || "";
}

function normalizeHex(value) {
  const text = String(value || "").trim();
  const match = text.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) {
    return "";
  }
  const hex = match[1].toLowerCase();
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((character) => `${character}${character}`)
      .join("")}`;
  }
  return `#${hex}`;
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((value) => clampByte(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
}

function contextAround(text, index) {
  return text.slice(Math.max(0, index - 48), index + 96).replace(/\s+/g, " ");
}

function cleanFontValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/!important/g, "")
    .trim()
    .slice(0, 160);
}

function dedupeBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function toProjectRelative(path) {
  return path.replace(`${projectRoot}/`, "");
}

function printHelp() {
  console.log(`Canvax external design-token extractor

Usage:
  node scripts/extract-design-tokens.mjs --file web/styles.css
  node scripts/extract-design-tokens.mjs --url https://example.com
  node scripts/extract-design-tokens.mjs --text ":root{--red:#e85d3a;font-family:Georgia}"

Options:
  --json       Print the token pack wrapper as JSON
  --dry-run    Do not write exports/canvax-external-design-tokens-latest.*

This is a local no-API extractor. It scans CSS/HTML text and public linked
stylesheets for colors, CSS variables, and font-family rules.`);
}
