import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export async function renderMarkdown(markdown: string) {
  const html = await marked.parse(markdown, {
    async: true,
    gfm: true,
    breaks: true
  });

  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title"]
    }
  });
}
