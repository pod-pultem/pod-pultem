export default async function handler(req, res) {
  try {
    const { collections = "", token = "" } = req.query;
    if (!token || token !== "shadow2025") return res.status(401).json({ error: "unauthorized" });

    const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
    if (!RAINDROP_TOKEN) return res.status(500).json({ error: "RAINDROP_TOKEN missing" });

    const FX = { CNY_TO_CZK: 3.2, MARKUP: 1.6, SHIPPING_CZK: 0 };
    const priceFromCNY = cny => Math.round((Number(cny||0)*FX.CNY_TO_CZK*FX.MARKUP + FX.SHIPPING_CZK)/10)*10;

    const ids = String(collections).split(",").map(s=>s.trim()).filter(Boolean);
    const headers = { Authorization: `Bearer ${RAINDROP_TOKEN}` };

    const out = [];
    for (const id of ids){
      const r = await fetch(`https://api.raindrop.io/rest/v1/raindrops/${encodeURIComponent(id)}?perpage=100`, { headers });
      if (!r.ok) continue;
      const data = await r.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      for (const it of items){
        const priceTag = [it?.excerpt, ...(it?.tags||[]), it?.note].filter(Boolean).join(" ");
        const m = priceTag.match(/(?:cny\s*[:=]?|¥|元|price\s*[:=]?|p:\s*)(\d{2,5})(?:\b|\D)/i);
        const priceCNY = m ? Number(m[1]) : undefined;

        const mediaImgs = Array.isArray(it?.media) ? it.media.filter(x=>x.type==='image').map(x=>x.link) : [];
        const images = mediaImgs.length ? mediaImgs : (it.cover ? [it.cover] : []);

        out.push({
          id: it._id || it.link,
          name: it.title || "",
          brand: (it.tags||[]).find(t=>/[A-Za-z]{3,}/.test(t)) || "",
          tags: it.tags || [],
          url: it.link,
          image: images[0] || null,
          images,
          priceCNY: priceCNY ?? null,
          priceCZK: priceCNY ? priceFromCNY(priceCNY) : null,
          sizes: [],
          sizeTableUrl: it.link
        });
      }
    }

    res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ products: out });
  } catch (e){
    return res.status(500).json({ error: String(e) });
  }
}
