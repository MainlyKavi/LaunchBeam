import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

if (process.platform === "win32") {
  const viteChunkPath = path.join(
    process.cwd(),
    "node_modules",
    "vite",
    "dist",
    "node",
    "chunks",
    "node.js",
  );

  const source = await readFile(viteChunkPath, "utf8");
  const needle = `\texec("net use", (error, stdout) => {
\t\tif (error) return;
\t\tconst lines = stdout.split("\\n");
\t\tfor (const line of lines) {
\t\t\tconst m = parseNetUseRE.exec(line);
\t\t\tif (m) windowsNetworkMap.set(m[2], m[1]);
\t\t}
\t\tif (windowsNetworkMap.size === 0) safeRealpathSync = fs.realpathSync.native;
\t\telse safeRealpathSync = windowsMappedRealpathSync;
\t});`;

  const replacement = `\ttry {
\t\texec("net use", (error, stdout) => {
\t\t\tif (error) return;
\t\t\tconst lines = stdout.split("\\n");
\t\t\tfor (const line of lines) {
\t\t\t\tconst m = parseNetUseRE.exec(line);
\t\t\t\tif (m) windowsNetworkMap.set(m[2], m[1]);
\t\t\t}
\t\t\tif (windowsNetworkMap.size === 0) safeRealpathSync = fs.realpathSync.native;
\t\t\telse safeRealpathSync = windowsMappedRealpathSync;
\t\t});
\t} catch {
\t\tsafeRealpathSync = fs.realpathSync.native;
\t}`;

  if (source.includes(needle) && !source.includes("safeRealpathSync = fs.realpathSync.native;\n\t}")) {
    await writeFile(viteChunkPath, source.replace(needle, replacement));
  }
}
