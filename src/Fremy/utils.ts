import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

async function ImportPath(path: string) {
  if (!path) return;
  const files = [...readAllFiles(path)].filter((file) => file.endsWith(".js"));
  const imports = await Promise.all(
    files.map((file) => import(pathToFileURL(file).href)),
  );
  return imports;
}

function* readAllFiles(dir: string): Generator<string> {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      yield* readAllFiles(path.join(dir, file.name));
    } else {
      yield path.join(dir, file.name);
    }
  }
}

export { readAllFiles, ImportPath };
