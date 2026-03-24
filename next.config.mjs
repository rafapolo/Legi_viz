/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/Legi_viz',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.camara.leg.br',
        pathname: '/internet/deputado/bandep/**',
      },
      {
        protocol: 'https',
        hostname: 'www.senado.leg.br',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'legis.senado.leg.br',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
