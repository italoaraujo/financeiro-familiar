const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Garante apenas a origem (protocolo + host + porta), caso a URL venha com subcaminhos
let apiOrigin = '';
try {
  apiOrigin = new URL(apiUrl).origin;
} catch {
  apiOrigin = apiUrl;
}

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ${apiOrigin} https:;`,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
