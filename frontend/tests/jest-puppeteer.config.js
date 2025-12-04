module.exports = {
  launch: {
    headless: process.env.CI === 'true' ? 'new' : false,
    slowMo: process.env.CI === 'true' ? 0 : 50,
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1920,1080'
    ],
    devtools: process.env.CI !== 'true'
  },
  browserContext: 'default'
  // Removed server configuration since we're running the server separately
};