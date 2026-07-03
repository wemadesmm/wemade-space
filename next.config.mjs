const isGithubPages = process.env.NEXT_PUBLIC_DEPLOY_TARGET === "github-pages";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: isGithubPages ? "/wemade-space" : "",
  assetPrefix: isGithubPages ? "/wemade-space/" : undefined
};

export default nextConfig;
