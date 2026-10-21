import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

async function ImportPath(pathname: string) {
  if (!pathname) return;
  const files = [...readAllFiles(pathname)].filter((file) =>
    file.endsWith(".js"),
  );
  const imports = await Promise.all(
    files.map((file) =>
      import(pathToFileURL(file).href).catch((err) => {
        throw new Error(`Failed to import ${file}: ${err.message}`, {
          cause: err,
        });
      }),
    ),
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
