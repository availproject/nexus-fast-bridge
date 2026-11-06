import { Marked, type Tokens } from "marked";
import { type CMSBlogPost, extractTocFromContent, slugifyHeading } from "./cms";

const FIGURE_STYLE = "margin: 1.5rem 0;";
const IMAGE_STYLE = "max-width: 100%; height: auto; border-radius: 10px;";
const UNDERLINE_STYLE = "text-decoration: underline;";
const UNORDERED_LIST_STYLE =
  "list-style-type: disc; padding-left: 1.5rem; margin: 0 0 1.25rem 0;";
const ORDERED_LIST_STYLE =
  "list-style-type: decimal; padding-left: 1.5rem; margin: 0 0 1.25rem 0;";
const LIST_ITEM_STYLE = "margin-bottom: 0.35rem;";

const RE_SAFE_LINK = /^(?:https?:\/\/|mailto:|#|\/(?![/\\]))/i;
const RE_SAFE_IMAGE = /^(?:https:\/\/|\/(?![/\\]))/i;
const RE_UNDERLINE_TAG = /^<(\/?)u>$/i;
const RE_BARE_AMPERSAND = /&(?!#?\w+;)/g;
const RE_LT = /</g;
const RE_GT = />/g;
const RE_QUOTE = /"/g;
const RE_APOSTROPHE = /'/g;
const RE_LINE_BREAK = /\r\n?/g;
const RE_FRONT_MATTER = /^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/;
const RE_LIST_ITEM = /^\s+-\s+(.*)$/;
const RE_KEY_VALUE = /^([A-Za-z]+):\s*(.*)$/;
const RE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

const STRING_FIELDS = [
  "title",
  "description",
  "author",
  "publishedAt",
  "lastUpdated",
  "createdAt",
  "coverImage",
  "reviewedBy",
  "seoTitle",
  "seoDescription",
] as const;

type StringField = (typeof STRING_FIELDS)[number];
type FrontMatter = Partial<Record<StringField, string>> & { tldr?: string[] };

export interface MarkdownGuide {
  createdAt: string;
  post: CMSBlogPost;
}

function escapeText(value: string): string {
  return value
    .replace(RE_BARE_AMPERSAND, "&amp;")
    .replace(RE_LT, "&lt;")
    .replace(RE_GT, "&gt;");
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(RE_LT, "&lt;")
    .replace(RE_GT, "&gt;")
    .replace(RE_QUOTE, "&quot;")
    .replace(RE_APOSTROPHE, "&#39;");
}

function renderImage({ href, text }: Tokens.Image): string {
  if (!RE_SAFE_IMAGE.test(href)) {
    return escapeText(text);
  }
  return `<img src="${escapeAttribute(href)}" alt="${escapeAttribute(text)}" style="${IMAGE_STYLE}" loading="lazy" />`;
}

/**
 * Guides end up in dangerouslySetInnerHTML, so this renderer never passes raw
 * HTML through: the only tag allowed is <u>, and links and images must use a
 * known-safe URL form.
 */
const markdown = new Marked({
  async: false,
  gfm: true,
  renderer: {
    blockquote({ tokens }) {
      return `<blockquote class="seo-callout">${this.parser.parse(tokens)}</blockquote>\n`;
    },
    heading({ depth, tokens }) {
      const inner = this.parser.parseInline(tokens);
      const id = slugifyHeading(inner);
      const idAttribute = id ? ` id="${id}"` : "";
      return `<h${depth}${idAttribute}>${inner}</h${depth}>\n`;
    },
    html({ text }) {
      const tag = text.trim().match(RE_UNDERLINE_TAG);
      if (!tag) {
        return escapeText(text);
      }
      return tag[1] ? "</u>" : `<u style="${UNDERLINE_STYLE}">`;
    },
    image: renderImage,
    link({ href, tokens }) {
      const inner = this.parser.parseInline(tokens);
      if (!RE_SAFE_LINK.test(href)) {
        return inner;
      }
      return `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
    },
    list(token) {
      const tag = token.ordered ? "ol" : "ul";
      const style = token.ordered ? ORDERED_LIST_STYLE : UNORDERED_LIST_STYLE;
      const start =
        token.ordered && token.start !== 1 && token.start !== ""
          ? ` start="${Number(token.start)}"`
          : "";
      const items = token.items.map((item) => this.listitem(item)).join("\n");
      return `<${tag}${start} style="${style}">\n${items}\n</${tag}>\n`;
    },
    listitem({ tokens }) {
      return `<li style="${LIST_ITEM_STYLE}">${this.parser.parse(tokens)}</li>`;
    },
    paragraph({ tokens }) {
      const content = tokens.filter(
        (token) => token.type !== "text" || token.raw.trim() !== ""
      );
      if (content.length === 1 && content[0].type === "image") {
        return `<figure style="${FIGURE_STYLE}">${this.parser.parseInline(content)}</figure>\n`;
      }
      return `<p>${this.parser.parseInline(tokens)}</p>\n`;
    },
    text(token) {
      if ("tokens" in token && token.tokens) {
        return this.parser.parseInline(token.tokens);
      }
      return escapeText(token.text);
    },
  },
});

export function renderGuideMarkdown(source: string): string {
  return markdown.parse(source, { async: false }).trim();
}

function parseValue(raw: string, label: string): string {
  const value = raw.trim();
  if (!value.startsWith('"')) {
    return value;
  }
  try {
    return String(JSON.parse(value));
  } catch {
    throw new Error(`${label}: invalid quoted value: ${value}`);
  }
}

function isStringField(key: string): key is StringField {
  return (STRING_FIELDS as readonly string[]).includes(key);
}

function parseFrontMatter(block: string, label: string): FrontMatter {
  const fields: FrontMatter = {};
  let inTldr = false;

  for (const line of block.split("\n")) {
    if (!line.trim()) {
      continue;
    }
    const listItem = line.match(RE_LIST_ITEM);
    if (listItem) {
      if (!inTldr) {
        throw new Error(`${label}: unexpected list item: ${line}`);
      }
      fields.tldr?.push(parseValue(listItem[1], label));
      continue;
    }

    const keyValue = line.match(RE_KEY_VALUE);
    if (!keyValue) {
      throw new Error(`${label}: cannot read front matter line: ${line}`);
    }
    const [, key, raw] = keyValue;
    inTldr = key === "tldr";
    if (inTldr) {
      fields.tldr = [];
    } else if (isStringField(key)) {
      fields[key] = parseValue(raw, label);
    } else {
      throw new Error(`${label}: unknown front matter field: ${key}`);
    }
  }

  return fields;
}

function requireField(
  fields: FrontMatter,
  key: StringField,
  label: string
): string {
  const value = fields[key];
  if (!value) {
    throw new Error(`${label}: missing required field: ${key}`);
  }
  return value;
}

/**
 * Turns one content/guides/<slug>.md file into a post. Anything malformed
 * throws, so a broken guide fails the build instead of quietly disappearing.
 */
export function parseGuideFile(slug: string, source: string): MarkdownGuide {
  const label = `content/guides/${slug}.md`;
  if (!RE_SLUG.test(slug)) {
    throw new Error(`${label}: file name must be lowercase-with-hyphens`);
  }

  const match = source.replace(RE_LINE_BREAK, "\n").match(RE_FRONT_MATTER);
  if (!match) {
    throw new Error(`${label}: missing front matter`);
  }

  const fields = parseFrontMatter(match[1], label);
  const title = requireField(fields, "title", label);
  const description = requireField(fields, "description", label);
  const author = requireField(fields, "author", label);
  const createdAt = requireField(fields, "createdAt", label);
  const coverImage = requireField(fields, "coverImage", label);
  const date = fields.lastUpdated ?? fields.publishedAt;

  if (!(date && RE_DATE.test(date))) {
    throw new Error(`${label}: lastUpdated or publishedAt must be YYYY-MM-DD`);
  }
  if (fields.publishedAt && !RE_DATE.test(fields.publishedAt)) {
    throw new Error(`${label}: publishedAt must be YYYY-MM-DD`);
  }
  if (!RE_DATE_TIME.test(createdAt) || Number.isNaN(Date.parse(createdAt))) {
    throw new Error(`${label}: createdAt must be a date`);
  }
  if (!RE_SAFE_IMAGE.test(coverImage)) {
    throw new Error(`${label}: coverImage must start with / or https://`);
  }

  const content = renderGuideMarkdown(match[2] ?? "");
  if (!content) {
    throw new Error(`${label}: guide has no content`);
  }

  return {
    createdAt,
    post: {
      slug,
      title,
      seoTitle: fields.seoTitle ?? title,
      seoDescription: fields.seoDescription ?? description,
      content,
      excerpt: description,
      summary: description,
      publishedAt: date,
      lastUpdated: date,
      author,
      reviewedBy: fields.reviewedBy ?? "",
      reviewer: fields.reviewedBy ?? "",
      tldr: fields.tldr,
      coverImage,
      featuredImage: coverImage,
      toc: extractTocFromContent(content),
    },
  };
}
