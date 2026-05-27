/** @type {import('next').NextConfig} */
const nextConfig = {
  // Aumentar timeout del servidor Next.js para requests lentos (Ollama local)
  experimental: {
    proxyTimeout: 180_000, // 3 minutos
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ]
  },
}

export default nextConfig
