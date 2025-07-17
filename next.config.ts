
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/.well-known/did-configuration.json',
        destination: '/did-configuration.json',
        permanent: true,
      },
      {
        source: '/.well-known/did.json',
        destination: '/did.json',
        permanent: true,
      }
    ]
  },
};

export default nextConfig;
