import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
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
  const image = readOption(argv, "--image") || readOption(argv, "--screenshot");
  if (image) {
    return readImageSource(image);
  }

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
    if (isImagePath(file)) {
      return readImageSource(file);
    }
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

async function readImageSource(file) {
  const path = resolve(projectRoot, file);
  const imageSamples = await sampleImagePalette(path);
  return {
    type: "image",
    label: toProjectRelative(path),
    url: "",
    path: toProjectRelative(path),
    text: "",
    linkedStylesheets: [],
    imageSamples,
  };
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
  const colors = mergeColorEntries([
    ...(source.imageSamples?.palette || []),
    ...extractColors(source.text || ""),
  ]);
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
      imageSamples: source.imageSamples || null,
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
      imageSampleCount: source.imageSamples?.sampleCount || 0,
    },
    summary: buildTokenSummary(source, palette, fonts),
    integration: {
      designKitImport: "Use palette as designKit.designTokens.palette.",
      styleLockImport:
        "Use palette, typography, and summary as external context for Canvax style locks.",
      noApiBoundary:
        "This extractor reads local files, local images, or public URLs only; it does not call an AI or paid image/API service.",
    },
  };
}

async function sampleImagePalette(path) {
  const bmp = await ensureBmp(path);
  try {
    const buffer = await readFile(bmp.path);
    const parsed = parseBmpPalette(buffer);
    return {
      kind: "canvax-image-token-sample",
      path: toProjectRelative(path),
      width: parsed.width,
      height: parsed.height,
      sampleCount: parsed.sampleCount,
      palette: parsed.palette,
      extractor: bmp.path === path ? "bmp-parser" : "sips-bmp-parser",
    };
  } finally {
    if (bmp.cleanupRoot) {
      await rm(bmp.cleanupRoot, { recursive: true, force: true });
    }
  }
}

async function ensureBmp(path) {
  if (extname(path).toLowerCase() === ".bmp") {
    return { path, cleanupRoot: "" };
  }
  const tempRoot = await mkdtemp(join(tmpdir(), "canvax-token-"));
  const outputPath = join(tempRoot, "source.bmp");
  try {
    await runCommand("/usr/bin/sips", [
      "-s",
      "format",
      "bmp",
      path,
      "--out",
      outputPath,
    ]);
    return { path: outputPath, cleanupRoot: tempRoot };
  } catch (error) {
    await rm(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

function parseBmpPalette(buffer) {
  if (buffer.readUInt16LE(0) !== 0x4d42) {
    throw new Error("Only BMP images can be sampled directly.");
  }
  const dataOffset = buffer.readUInt32LE(10);
  const width = buffer.readInt32LE(18);
  const signedHeight = buffer.readInt32LE(22);
  const bitsPerPixel = buffer.readUInt16LE(28);
  const compression = buffer.readUInt32LE(30);
  if (!width || !signedHeight || ![24, 32].includes(bitsPerPixel)) {
    throw new Error("Unsupported BMP dimensions or bit depth.");
  }
  if (compression !== 0) {
    throw new Error("Compressed BMP images are not supported.");
  }
  const height = Math.abs(signedHeight);
  const topDown = signedHeight < 0;
  const bytesPerPixel = bitsPerPixel / 8;
  const rowStride = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
  const maxSamples = 60000;
  const step = Math.max(1, Math.ceil(Math.sqrt((width * height) / maxSamples)));
  const colorStep = width * height > 4096 ? 8 : 1;
  const counts = new Map();
  let sampleCount = 0;

  for (let y = 0; y < height; y += step) {
    const row = topDown ? y : height - 1 - y;
    for (let x = 0; x < width; x += step) {
      const offset = dataOffset + row * rowStride + x * bytesPerPixel;
      if (offset + 2 >= buffer.length) {
        continue;
      }
      const blue = buffer[offset];
      const green = buffer[offset + 1];
      const red = buffer[offset + 2];
      const hex = rgbToHex(
        quantizeChannel(red, colorStep),
        quantizeChannel(green, colorStep),
        quantizeChannel(blue, colorStep),
      );
      const entry = counts.get(hex) || {
        hex,
        count: 0,
        examples: ["sampled from image pixels"],
      };
      entry.count += 1;
      counts.set(hex, entry);
      sampleCount += 1;
    }
  }

  return {
    width,
    height,
    sampleCount,
    palette: [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 24),
  };
}

function quantizeChannel(value, step) {
  if (step <= 1) {
    return value;
  }
  return clampByte(Math.round(value / step) * step);
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

function mergeColorEntries(entries) {
  const counts = new Map();
  entries.forEach((entry) => {
    const hex = normalizeHex(entry?.hex || "");
    if (!hex) {
      return;
    }
    const current = counts.get(hex) || {
      hex,
      count: 0,
      examples: [],
    };
    current.count += Number(entry.count) || 1;
    (entry.examples || []).slice(0, 4).forEach((example) => {
      if (example && current.examples.length < 8) {
        current.examples.push(String(example));
      }
    });
    counts.set(hex, current);
  });
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
  const imageSummary = source.imageSamples
    ? `Image samples: ${source.imageSamples.sampleCount} pixels across ${source.imageSamples.width}x${source.imageSamples.height}.`
    : "";
  return `${source.type} source: ${source.label}. ${colorSummary}. ${fontSummary}. ${imageSummary}`.trim();
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
    pack.source.imageSamples
      ? `- Image samples: ${pack.source.imageSamples.sampleCount}`
      : "",
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

function isImagePath(path) {
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"].includes(
    extname(path).toLowerCase(),
  );
}

function runCommand(command, commandArgs) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(stderr.trim() || `${command} exited with code ${code}`),
      );
    });
  });
}

function printHelp() {
  console.log(`Canvax external design-token extractor

Usage:
  node scripts/extract-design-tokens.mjs --file web/styles.css
  node scripts/extract-design-tokens.mjs --image artifacts/canvax/browser-snapshots/latest/board-desktop-1440x1024.png
  node scripts/extract-design-tokens.mjs --url https://example.com
  node scripts/extract-design-tokens.mjs --text ":root{--red:#e85d3a;font-family:Georgia}"

Options:
  --json       Print the token pack wrapper as JSON
  --dry-run    Do not write exports/canvax-external-design-tokens-latest.*

This is a local no-API extractor. It scans CSS/HTML text, public linked
stylesheets, and local raster screenshots for colors, CSS variables, and
font-family rules.`);
}
