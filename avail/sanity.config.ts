import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemaTypes";

export default defineConfig({
  name: "default",
  title: "avail",

  projectId: "84yp3g05",
  dataset: "guides",

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
});
