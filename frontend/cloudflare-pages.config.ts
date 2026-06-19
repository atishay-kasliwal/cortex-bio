/**
 * Cloudflare Pages deployment configuration.
 * Reference for dashboard setup — GitHub-connected deploys use these values.
 */
export const cloudflarePagesConfig = {
  projectName: "atriveo-bio",
  productionBranch: "main",
  rootDirectory: "cortex-bio/frontend",
  buildCommand: "npm ci && npm run build",
  outputDirectory: ".output/public",
  nodeVersion: "20",
  productionDomains: ["bio.atriveo.com"],
  previewDomains: ["preview.bio.atriveo.com"],
  environment: {
    production: {
      VITE_API_URL: "https://api.cortex.bio",
      VITE_DOCS_API_URL: "https://api.cortex.bio",
    },
    preview: {
      VITE_API_URL: "https://api.cortex.bio",
      VITE_DOCS_API_URL: "https://api.cortex.bio",
    },
  },
} as const;

export default cloudflarePagesConfig;
