// build.js
import * as esbuild from "esbuild";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create .env content for injection
const env = {};
for (const key in process.env) {
  env[`process.env.${key}`] = JSON.stringify(process.env[key]);
}

await esbuild.build({
  entryPoints: ["./index.js"],
  outdir: "./dist",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node16",
  sourcemap: true,
  minify: process.env.NODE_ENV === "production",
  packages: "external",
  define: env, // Inject environment variables
});
