import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  parseGuideFile,
  renderGuideMarkdown,
} from "../packages/fast-bridge-app/src/lib/guide-markdown";

const GUIDES_DIR = "content/guides";
const RE_IMAGE_PATH = /\/guide-images\/[^")\s]+/g;
const RE_EVENT_HANDLER_TAG = /<[a-z][^>]*\son\w+\s*=/i;
const RE_ENV_PREFIX = /envPrefix:\s*\[([^\]]*)\]/;
const RE_FORBIDDEN_TAG = /<(script|iframe|svg|style|div)\b/i;
const RE_BAD_FILE_NAME = /lowercase-with-hyphens/;

const VALID_FRONT_MATTER = `---
title: "A guide"
description: "About it"
author: "Someone"
lastUpdated: 2026-01-02
createdAt: 2026-01-01T10:00:00Z
coverImage: /guide-images/a-guide/cover.png
---
`;

const guideFiles = readdirSync(GUIDES_DIR).filter((file) =>
  file.endsWith(".md")
);

function readGuide(file: string): string {
  return readFileSync(join(GUIDES_DIR, file), "utf-8");
}

test("every guide in the repo parses and uses a local cover image", () => {
  assert.ok(guideFiles.length >= 6);
  for (const file of guideFiles) {
    const { post } = parseGuideFile(file.replace(".md", ""), readGuide(file));
    assert.ok(post.content.length > 0, file);
    assert.ok(post.toc.length > 0, file);
    assert.ok(post.coverImage.startsWith(`/guide-images/${post.slug}/`), file);
  }
});

test("every image a guide references exists", () => {
  for (const file of guideFiles) {
    const paths = readGuide(file).match(RE_IMAGE_PATH) ?? [];
    assert.ok(paths.length > 0, file);
    for (const path of paths) {
      assert.ok(existsSync(join("public", path)), `${file}: ${path}`);
    }
  }
});

test("no guide depends on Sanity", () => {
  for (const file of guideFiles) {
    assert.ok(!readGuide(file).includes("sanity.io"), file);
  }
});

test("renders the markup the guide page styles expect", () => {
  const html = renderGuideMarkdown(`## **Why it's good**

Some **bold** and [a link](https://example.com/a?b=1&c=2).

- one
- two

![](/guide-images/a/1.png)`);

  assert.ok(html.includes('<h2 id="why-it-s-good"><strong>Why it\'s good'));
  assert.ok(
    html.includes(
      '<a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">a link</a>'
    )
  );
  assert.ok(html.includes('<li style="margin-bottom: 0.35rem;">one</li>'));
  assert.ok(html.includes('<figure style="margin: 1.5rem 0;"><img src='));
  assert.ok(!html.includes("<p><figure"));
});

test("raw HTML can't run", () => {
  const attacks = [
    "<script>alert(1)</script>",
    "text <script>alert(1)</script> text",
    "<img src=x onerror=alert(1)>",
    "text <img src=x onerror=alert(1)> text",
    '<iframe src="https://evil.example"></iframe>',
    "<svg onload=alert(1)>",
    '<div onclick="alert(1)">click</div>',
    "<!-- comment --><style>body{display:none}</style>",
    "<u onclick=alert(1)>click</u>",
    "- <script>alert(1)</script>",
    "## <img src=x onerror=alert(1)>",
    "> <script>alert(1)</script>",
  ];
  for (const attack of attacks) {
    const html = renderGuideMarkdown(attack);
    assert.ok(!RE_FORBIDDEN_TAG.test(html), html);
    assert.ok(!html.includes("<img"), html);
    assert.ok(!RE_EVENT_HANDLER_TAG.test(html), html);
  }
});

test("unsafe link and image URLs are dropped", () => {
  const links = [
    "[x](javascript:alert(1))",
    "[x](JaVaScRiPt:alert(1))",
    "[x](data:text/html,<script>alert(1)</script>)",
    "[x](vbscript:alert(1))",
    "[x](//evil.example)",
    "[x](/\\evil.example)",
    "<javascript:alert(1)>",
  ];
  for (const link of links) {
    const html = renderGuideMarkdown(link);
    assert.ok(!html.includes("<a "), html);
  }

  const images = [
    "![x](javascript:alert(1))",
    "![x](data:image/svg+xml,<svg onload=alert(1)>)",
    "![x](//evil.example/a.png)",
    "![x](http://evil.example/a.png)",
  ];
  for (const image of images) {
    const html = renderGuideMarkdown(image);
    assert.ok(!html.includes("<img"), html);
  }
});

test("values can't break out of attributes", () => {
  const image = renderGuideMarkdown('![a" onerror="alert(1)](/a.png)');
  assert.ok(!image.includes('" onerror="'), image);

  const link = renderGuideMarkdown(
    '[x](https://example.com/"onmouseover="alert(1))'
  );
  assert.ok(!link.includes('"onmouseover="'), link);
});

test("<u> is the only tag allowed through", () => {
  const html = renderGuideMarkdown("Some <u>underlined</u> text");
  assert.ok(
    html.includes('<u style="text-decoration: underline;">underlined</u>')
  );
});

test("valid front matter gives a complete post", () => {
  const { post, createdAt } = parseGuideFile(
    "a-guide",
    `${VALID_FRONT_MATTER}\nBody text.\n`
  );
  assert.equal(post.slug, "a-guide");
  assert.equal(post.title, "A guide");
  assert.equal(post.seoTitle, "A guide");
  assert.equal(post.excerpt, "About it");
  assert.equal(post.lastUpdated, "2026-01-02");
  assert.equal(post.publishedAt, "2026-01-02");
  assert.equal(post.featuredImage, "/guide-images/a-guide/cover.png");
  assert.equal(createdAt, "2026-01-01T10:00:00Z");
});

test("Windows line endings parse the same", () => {
  const source = `${VALID_FRONT_MATTER}tldr_placeholder`.replace(
    "tldr_placeholder",
    "\nBody text.\n"
  );
  const lf = parseGuideFile("a-guide", source);
  const crlf = parseGuideFile("a-guide", source.replace(/\n/g, "\r\n"));
  assert.deepEqual(crlf, lf);
});

test("malformed guides throw instead of disappearing", () => {
  const body = "\nBody text.\n";
  const broken: [string, string, string][] = [
    ["no front matter", "Just text", "missing front matter"],
    [
      "no title",
      VALID_FRONT_MATTER.replace('title: "A guide"\n', "") + body,
      "missing required field: title",
    ],
    [
      "typo in a field",
      VALID_FRONT_MATTER.replace("author:", "auther:") + body,
      "unknown front matter field: auther",
    ],
    [
      "bad date",
      VALID_FRONT_MATTER.replace("2026-01-02", "January 2") + body,
      "YYYY-MM-DD",
    ],
    [
      "bad createdAt",
      VALID_FRONT_MATTER.replace("2026-01-01T10:00:00Z", "soon") + body,
      "createdAt",
    ],
    [
      "unsafe cover image",
      VALID_FRONT_MATTER.replace(
        "/guide-images/a-guide/cover.png",
        "javascript:alert(1)"
      ) + body,
      "coverImage",
    ],
    ["empty body", VALID_FRONT_MATTER, "no content"],
  ];
  for (const [name, source, expected] of broken) {
    assert.throws(
      () => parseGuideFile("a-guide", source),
      (error: Error) => error.message.includes(expected),
      name
    );
  }
});

test("a file name can't escape the guides folder", () => {
  for (const slug of ["../../evil", "UPPER", "a b", "a/b", ""]) {
    assert.throws(
      () => parseGuideFile(slug, `${VALID_FRONT_MATTER}\nBody.\n`),
      RE_BAD_FILE_NAME
    );
  }
});

test("the build only exposes allowlisted variables", () => {
  const entries = readFileSync("vite.config.ts", "utf-8").match(RE_ENV_PREFIX);
  assert.ok(entries, "envPrefix must be an explicit list");
  assert.ok(!entries[1].includes('"VITE_"'));
  assert.ok(!entries[1].toLowerCase().includes("sanity"));
});
