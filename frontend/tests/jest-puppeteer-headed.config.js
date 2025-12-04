module.exports = {
  launch: {
    headless: false,
    slowMo: 100,
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
      '--start-maximized',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ],
    devtools: true,
    ignoreHTTPSErrors: true
  },
  browserContext: 'default',
  exitOnPageError: false
};