const ALLOWED_PARAMETERS = ['t', 'r', 'c', 's'];
const SOLIQ_API_URL = 'https://ofd.soliq.uz/api/check';

module.exports = async function soliqHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const params = new URLSearchParams();
  for (const name of ALLOWED_PARAMETERS) {
    const value = req.query[name];
    if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
      res.status(400).json({ error: `Missing or invalid "${name}" parameter.` });
      return;
    }
    params.set(name, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const upstream = await fetch(`${SOLIQ_API_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'uz-UZ,uz;q=0.9,ru;q=0.8,en;q=0.7',
        'Referer': 'https://ofd.soliq.uz/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="131", "Chromium";v="131"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);
    const body = await upstream.text();

    if (!upstream.ok) {
      console.error(`[api/soliq] HTTP ${upstream.status}:`, body.substring(0, 200));
      res.status(502).json({ error: `Soliq API returned HTTP ${upstream.status}.` });
      return;
    }

    let result;
    try {
      result = JSON.parse(body);
    } catch (error) {
      console.warn('[api/soliq] Soliq API returned non-JSON, attempting HTML parse...');
      const htmlResult = parseSoliqHtml(body);
      if (htmlResult && htmlResult.totalSum) {
        res.status(200).json(htmlResult);
        return;
      }
      res.status(502).json({ error: 'Soliq API returned an invalid response format.' });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    clearTimeout(timeout);
    console.error('[api/soliq] Soliq API request failed:', error);
    const isTimeout = error && error.name === 'AbortError';
    res.status(isTimeout ? 504 : 502).json({
      error: isTimeout ? 'Soliq API request timed out.' : 'Could not fetch Soliq receipt data.'
    });
  }
};

function parseSoliqHtml(html) {
  try {
    const totalMatch = html.match(/To'lov\s+uchun\s+jami[:\s]*([\d\s,]+)/i) ||
                       html.match(/TOTAL[:\s]*([\d\s,]+)/i) ||
                       html.match(/ИТОГО[:\s]*([\d\s,]+)/i);
    
    const items = [];
    const itemRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([\d\s,]+)<\/td>[\s\S]*?<\/tr>/gi;
    let match;
    while ((match = itemRegex.exec(html)) !== null) {
      items.push({ name: match[1].trim(), price: match[2].trim() });
    }

    return {
      totalSum: totalMatch ? totalMatch[1].replace(/\s/g, '') : null,
      items: items
    };
  } catch (error) {
    console.error('[parseSoliqHtml] Error:', error);
    return null;
  }
}
