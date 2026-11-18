export const adminHead = (section: string, description: string) => ({
  meta: [
    { title: `${section} — Painel Crazy` },
    { name: "description", content: description },
    { property: "og:title", content: `${section} — Painel Crazy` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ],
});