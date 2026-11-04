import type { CMSBlogPost } from "./cms";
import { parseGuideFile } from "./guide-markdown";

const RE_FILE_NAME = /([^/]+)\.md$/;

const guideFiles = import.meta.glob<string>("/content/guides/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
});

// Newest first, the order the guides list has always used.
const guides: CMSBlogPost[] = Object.entries(guideFiles)
  .map(([path, source]) =>
    parseGuideFile(path.match(RE_FILE_NAME)?.[1] ?? path, source)
  )
  .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  .map(({ post }) => post);

if (guides.length === 0) {
  throw new Error("No guides found in content/guides");
}

export function loadMarkdownGuides(): CMSBlogPost[] {
  return guides;
}
