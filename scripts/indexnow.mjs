const apiKey = process.env.BING_WEBMASTER_API_KEY;
// IndexNow requires the actual hosting site URL, not the Firebase auth domain
const host = (process.env.VITE_HOSTING_URL || 'smepulse-equisaas-bd.web.app')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');

if (!apiKey) {
  console.error("Missing BING_WEBMASTER_API_KEY in .env");
  process.exit(1);
}

async function pingIndexNow() {
  const hosts = [
    'smepulse.equisaas-bd.com',
    'equipulse-ai.equisaas-bd.com'
  ];

  for (const h of hosts) {
    console.log(`Pinging IndexNow for host: ${h}`);
    const urlList = [
      `https://${h}/`,
      `https://${h}/pos`,
      `https://${h}/inventory`,
      `https://${h}/leaderboard`,
      `https://${h}/metrics`,
      `https://${h}/data`,
      `https://${h}/queue`
    ];

    const payload = {
      host: h,
      key: apiKey,
      keyLocation: `https://${h}/${apiKey}.txt`,
      urlList: urlList
    };

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok || response.status === 200 || response.status === 202) {
      console.log(`Successfully pinged IndexNow for ${h}: ` + response.status);
    } else {
      console.error(`Failed to ping IndexNow for ${h}: HTTP ${response.status} ${await response.text()}`);
    }
  }
}

pingIndexNow().catch((error) => {
  console.error(error);
  process.exit(1);
});
