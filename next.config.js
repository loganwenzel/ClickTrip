/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    TRANSLINK_API_KEY: process.env.TRANSLINK_API_KEY,
  },
};

module.exports = nextConfig;
