export type ContentType = "story" | "video" | "post";

export const CONTENT_TYPES: { id: ContentType; label: string; emoji: string }[] = [
  { id: "story", label: "Story", emoji: "🌙" },
  { id: "video", label: "Video", emoji: "🎬" },
  { id: "post", label: "Post", emoji: "📣" },
];

export function renderCaption(template: string, title: string): string {
  return template.replaceAll("{{title}}", title.trim());
}
