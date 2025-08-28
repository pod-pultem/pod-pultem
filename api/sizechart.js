function sanitizeTable(html){
  return String(html)
    .replace(/<(?!\/?(?:table|thead|tbody|tr|th|td|div|span|p|strong|em|b|i)\b)[^>]*>/g, '')
    .replace(/on\w+\s*=\s*"[^"]*"/g,'');
}

export default async function handler(req, res){
  try {
    const { url = "", token = "" } = req.query;
    if (!token || token !== "shadow2025") return res.status(401).json({ error: "unauthorized" });
    if (!url) return res.status(400).json({ error: "url missing" });

    const r = await fetch(url, { headers:{ 'User-Agent':'Mozilla/5.0' }});
    if (!r.ok) return res.status(502).json({ error: `fetch ${r.status}` });
    const html = await r.text();

    const tblMatch = html.match(/<table[\s\S]*?<\/table>/i);
    const tableHtml = tblMatch ? sanitizeTable(tblMatch[0]) : null;

    const imgs = Array.from(html.matchAll(/<img[^>]+src=["']([^"'>]+)["'][^>]*>/ig))
      .map(m=>m[1])
      .filter(src=>/\.(?:jpg|jpeg|png|webp)(?:\?|$)/i.test(src))
      .slice(0, 12);

    res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ html: tableHtml, images: imgs });
  } catch (e){
    return res.status(500).json({ error: String(e) });
  }
}
