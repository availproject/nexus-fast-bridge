import { defineField, defineType } from "sanity";

export const blogType = defineType({
  name: "blog",
  title: "Blog Post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description / Summary",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "reviewedBy",
      title: "Reviewed By",
      type: "reference",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "tldr",
      title: "TL;DR (Bulleted Highlights)",
      type: "array",
      of: [{ type: "string" }],
      description: "Bulleted list of key takeaways shown in the TL;DR section.",
    }),
    defineField({
      name: "lastUpdated",
      title: "Last Updated Date",
      type: "datetime",
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    }),
    defineField({
      name: "featuredImage",
      title: "Featured / Cover Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "reference", to: [{ type: "category" }] }],
    }),
    defineField({
      name: "body",
      title: "Body / Content",
      type: "array",
      of: [{ type: "block" }, { type: "image" }],
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "featuredImage",
    },
    prepare(selection) {
      const { author } = selection;
      return { ...selection, subtitle: author ? `by ${author}` : "" };
    },
  },
});
