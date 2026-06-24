const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;

if (!token || !zoneId) {
  console.error("Missing Cloudflare credentials in .env");
  process.exit(1);
}

async function purgeCloudflare() {
  console.log('Purging Cloudflare cache...');
  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      purge_everything: true
    })
  });
  
  const result = await response.json().catch(() => null);
  if (response.ok && result?.success) {
    console.log('Successfully purged Cloudflare cache!');
  } else {
    throw new Error(`Failed to purge Cloudflare cache: HTTP ${response.status} ${JSON.stringify(result)}`);
  }
}

purgeCloudflare().catch((error) => {
  console.error(error);
  process.exit(1);
});
