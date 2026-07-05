import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    ignores: [
      "**/node_modules/**", 
      "**/dist/**", 
      "**/build/**", 
      "client/dist/**", 
      "admin/dist/**",
      "**/*.json"
    ]
  },
  {
    files: ["**/*.js", "**/*.jsx", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
        chrome: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-case-declarations": "off",
      "no-empty": "off"
    }
  }
];
