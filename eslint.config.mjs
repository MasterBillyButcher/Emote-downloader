import { FlatCompat } from "@eslint/eslintrc";

// FlatCompat lets us reuse "next/core-web-vitals" (still shipped as an
// eslintrc-style config) under ESLint 9's flat config format.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: ["node_modules/**", ".next/**"],
  },
];

export default eslintConfig;
