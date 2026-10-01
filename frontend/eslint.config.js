const nextConfig = require('eslint-config-next');

module.exports = [
  ...nextConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-location-assign-relative-destination': 'warn',
    },
  },
];
