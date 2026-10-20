import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  tseslint.configs.recommended,
  {
    files: ["./src/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    rules: {
      "no-constructor-return": "error",
      "prefer-const": ["warn"],
      "no-await-in-loop": "warn",
      "no-unused-vars": "warn",
      "no-explicit-any": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
    languageOptions: {
      globals: globals.node,
    },
  },
]);
