import js from "@eslint/js";
import globals from "globals";
import importPluginX from "eslint-plugin-import-x";

export default [
  js.configs.recommended, 
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      "import-x": importPluginX
    },
    settings: {
      "import-x/resolver": {
        node: true
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "warn",
      "no-undef": "error",
      "import-x/named": "error",
      "import-x/no-unresolved": ["error", { caseSensitive: true }],
      "import-x/extensions": ["error", "always", { js: "always" }]
    }
  }
];
