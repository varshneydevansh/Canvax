import { lstat, mkdir, readlink, symlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const source = resolve(projectRoot, "codex-skill", "canvax");
const target = resolve(homedir(), ".codex", "skills", "canvax");

await mkdir(dirname(target), { recursive: true });

try {
  const info = await lstat(target);
  if (info.isSymbolicLink()) {
    const linkedTarget = await readlink(target);
    const resolvedLink = resolve(dirname(target), linkedTarget);
    if (resolvedLink === source) {
      console.log(`Canvax skill already installed at ${target}`);
      console.log(
        "Use /canvax as the preferred Codex slash-listed skill entry; use $canvax as the explicit skill fallback.",
      );
      process.exit(0);
    }
  }

  console.error(`A different skill already exists at ${target}`);
  process.exit(1);
} catch {
  await symlink(source, target, "dir");
  console.log(`Installed Canvax skill at ${target}`);
  console.log(
    "Use /canvax as the preferred Codex slash-listed skill entry; use $canvax as the explicit skill fallback.",
  );
  console.log("Restart Codex if it is already running.");
}
