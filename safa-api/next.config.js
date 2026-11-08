/** Отдельный проект SAFA API. Мобильному приложению CORS не нужен, поэтому «Access-Control-Allow-Origin: *» не задаётся. */
const path = require('path');

const nextConfig = {
  poweredByHeader: false,
  // В репозитории лежат и другие проекты со своими lock-файлами: корень трассировки — эта папка
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['mongodb'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
