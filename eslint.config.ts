import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist/*", "./typings/*"]),
  {
    files: ["./*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    rules: {
      "no-constructor-return": "error",
      "prefer-const": ["warn"],
      "no-await-in-loop": "warn",
      "no-unused-vars": "warn",
    },
    languageOptions: {
      globals: globals.node,
    },
  },
  tseslint.configs.recommended,
]);
