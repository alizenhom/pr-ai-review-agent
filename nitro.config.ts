import { defineConfig } from "nitro";

export default defineConfig({
  preset: "vercel",
  modules: ["workflow/nitro"],
  routes: {
    "/**": "./src/index.ts"
  }
});