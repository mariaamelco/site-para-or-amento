import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    // O PDF é gerado no navegador e só consegue desenhar imagens do próprio site.
    // A Vercel repassa /foto/ID para a loja Digital Sat.
    return [
      {
        source: "/foto/:id(\\d+)",
        destination:
          "https://loja.digitalsat.com.br/imagem/produto/id/:id/width/300/height/300/index/0",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/catalog.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
      {
        source: "/foto/:id",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
    ];
  },
};

export default nextConfig;
