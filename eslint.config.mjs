import nextConfig from "eslint-config-next";

const baseConfigs = Array.isArray(nextConfig) ? nextConfig : [nextConfig];

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  ...baseConfigs,
  {
    // Project-level rule overrides.
    // Setting state inside a useEffect after checking a dependency is a
    // deliberately used pattern in this codebase for form initialisation from
    // a fetched entity.  The rule is downgraded to a warning so it surfaces in
    // the output without blocking CI.
    rules: {
      // Setting state inside a useEffect after checking a dependency is a
      // deliberately used pattern in this codebase for form initialisation from
      // a fetched entity.  The rule is downgraded to a warning so it surfaces in
      // the output without blocking CI.
      "react-hooks/set-state-in-effect": "warn",
      // window.location.href assignment is used for post-delete navigation in
      // a few pages.  The pattern is intentional; downgrade to warning.
      "react-hooks/immutability": "warn",
    },
  },
];

export default config;
