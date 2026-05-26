/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from Supabase storage (for studio/instructor photos)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ljebzcgfydaknyekwlqv.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
