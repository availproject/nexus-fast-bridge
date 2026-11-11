# Publishing Guides

Each guide is a Markdown file in this repository. There is no CMS: to publish or change a guide, open a pull request. Merging it deploys the guide with the next build.

## Add a Guide

1. Create `content/guides/<slug>.md`. The file name becomes the URL (`/guides/<slug>`), so use lowercase letters, numbers and hyphens. Don't rename a published guide: its URL would change.
2. Put its images in `public/guide-images/<slug>/`.
3. Run `pnpm test:guides` and `pnpm build`, then open a pull request.

A guide starts with this block, followed by the text:

```markdown
---
title: "How to Bridge to Arc"
description: "Shown under the title, and used for search and social previews."
author: "Andria E"
publishedAt: 2026-09-22
lastUpdated: 2026-09-22
createdAt: 2026-09-22T14:22:45Z
coverImage: /guide-images/how-to-bridge-to-arc/cover.png
tldr:
  - "First key point."
  - "Second key point."
---

The guide's opening paragraph.

## A section heading

![Describe the image](/guide-images/how-to-bridge-to-arc/1.png)
```

| Field | Required | Meaning |
| --- | --- | --- |
| `title`, `description`, `author` | Yes | Use double quotes if the value contains a colon or quotes. |
| `lastUpdated` | Yes, unless `publishedAt` is set | The date shown on the guide and in the list, as `YYYY-MM-DD`. |
| `publishedAt` | No | The date the guide first went out, as `YYYY-MM-DD`. |
| `createdAt` | Yes | Sets the position in the list, newest first. |
| `coverImage` | Yes | The guide card and social preview image. |
| `tldr` | No | The TL;DR list at the top of the guide. |
| `reviewedBy`, `seoTitle`, `seoDescription` | No | Reviewer name, and overrides for search results. |

A mistake in this block, such as an unknown field or a missing title, fails the build and names the file. That's deliberate: a broken guide stops the deploy rather than disappearing from the site.

## What the Text Can Contain

Headings (`##`, `###`), paragraphs, lists, **bold**, *italic*, links, images and tables all work. `##` and `###` headings fill the "On this page" list.

For safety, raw HTML is shown as plain text, apart from `<u>` for underlining. Links must start with `https://`, `http://`, `mailto:`, `/` or `#`, and images with `https://` or `/`. Anything else is dropped.

Please write alt text for new images, between the square brackets. Some older guides have none yet.
