/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'react-icons', 
      'lucide-react', 
      '@radix-ui/react-avatar', 
      '@radix-ui/react-dropdown-menu', 
      '@radix-ui/react-separator', 
      '@radix-ui/react-slot'
    ],
  },
  reactStrictMode: true,
};

export default nextConfig;
