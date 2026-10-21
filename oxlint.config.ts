import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  env: { browser: false, node: true },
  extends: [core],
});
