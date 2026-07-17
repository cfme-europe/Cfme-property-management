import type { NextConfig } from "next";

const ontwikkelOrigins =
  process.env.NODE_ENV === "development"
    ? [
        "localhost:3000",
        ...(process.env.CODESPACE_NAME
          ? [
              `${process.env.CODESPACE_NAME}-3000.app.github.dev`,
            ]
          : []),
      ]
    : [];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ontwikkelOrigins,
    },
  },
};

export default nextConfig;
