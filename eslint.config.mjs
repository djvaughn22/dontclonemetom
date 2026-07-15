import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Synced Open Mirror chrome — canonical lives in the hub repo; not linted here.
    "app/OpenMirrorNav.tsx",
    "app/OpenMirrorFooter.tsx",
    "app/OpenMirrorTheme.tsx",
  ]),
]);

export default eslintConfig;
