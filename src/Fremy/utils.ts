import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

async function ImportModules<T>(
  directory: string,
  isValid: (value: unknown) => value is T,
): Promise<T[]> {
  const items: T[] = [];
  for (const file of fs.globSync("**/*.{js,ts}", {
    cwd: directory,
    exclude: ["**/*.d.ts", "**/*.map.ts*"],
  })) {
    const root = path.resolve(directory, file);
    const url = pathToFileURL(root).href;

    const mod: Record<string, unknown> = await import(url);
    for (const value of Object.values(mod)) {
      if (isValid(value)) items.push(value);
      else console.warn(`Bad module: ${file}`);
    }
  }
  return items;
}

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

export { ImportModules, readAllFiles, ImportPath };
