import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const ENV_ONLY_MESSAGE =
  "Do not read the environment directly. Import typed config from '@/lib/env' instead (see docs/environment.md).";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Single source of truth for config: only src/lib/env.ts may read the environment.
  // Everything else must import typed values from "@/lib/env".
  {
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: ENV_ONLY_MESSAGE },
      ],
    },
  },
  {
    // The env module and instrumentation are the only places allowed to touch the environment.
    files: ["src/lib/env.ts", "src/instrumentation.ts", "*.config.*", "next.config.ts"],
    rules: { "no-restricted-properties": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated/minified vendor worker assets:
    "public/pdf.worker.min.mjs",
    "public/worker.js",
  ]),
]);

export default eslintConfig;
