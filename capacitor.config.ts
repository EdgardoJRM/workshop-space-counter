/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "com.hernandezmedia.pass.staff",
  appName: "Hernandez Pass Staff",
  webDir: "out",
  server: {
    url:
      process.env.CAPACITOR_SERVER_URL ||
      "https://workshop-space-counter.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
