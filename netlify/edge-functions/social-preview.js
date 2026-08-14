// netlify/edge-functions/social-preview.js
//
// MASALAH YANG DISELESAIN: situs ini SPA (React + Vite), semua konten (termasuk isi
// tiap artikel) baru "ada" SETELAH JavaScript React jalan di browser. Crawler share kayak
// WhatsApp/Facebook/Twitter/Telegram TIDAK menjalankan JS pas bikin preview link — mereka
// cuma baca index.html mentah. Makanya sepintar apapun meta tag di-update dari React
// (lihat src/lib/pageMeta.js), bot itu gak akan pernah lihat hasilnya.
//
// SOLUSI: function ini jalan di edge (sebelum request nyampe ke index.html statis), CUMA
// buat request dari bot yang dikenal. Kalau requestnya minta artikel spesifik
// (?tab=Projects&article=<id>), function ini ambil data artikel itu langsung dari Supabase
// (server-side, bukan lewat browser), terus TIMPA <title> & meta tag OG/Twitter di
// index.html sebelum dikirim balik ke bot. Pengunjung manusia biasa TIDAK kena efek apa-apa
// (langsung context.next(), jalan normal kayak biasa) — jadi ga nambah beban/latency buat
// visitor asli, cuma buat bot doang.
//
// CARA PASANG:
// 1. Taro file ini persis di: netlify/edge-functions/social-preview.js (folder harus
//    persis segini namanya, dari root project — sejajar sama src/, bukan di dalem src/).
// 2. GAK PERLU netlify.toml — routing-nya udah didefinisiin di `export const config`
//    paling bawah file ini (fitur Netlify yang lebih baru, deklarasi inline).
// 3. Di Netlify dashboard: Site settings → Environment variables → tambahin DUA variable
//    BARU (beda dari yang udah ada buat React/Vite):
//      SUPABASE_URL       = (sama kayak isi VITE_SUPABASE_URL lo)
//      SUPABASE_ANON_KEY  = (sama kayak isi VITE_SUPABASE_ANON_KEY lo)
//    HARUS tanpa prefix VITE_ — prefix VITE_ itu cuma di-inline ke bundle browser pas
//    build, Edge Function jalan di runtime server jadi butuh env var sendiri yang gak
//    di-strip. Pastiin scope-nya kecentang buat "Edge functions" (bukan cuma "Builds").
// 4. Deploy ulang, terus test pake Facebook Sharing Debugger / Twitter Card Validator /
//    atau langsung: curl -A "facebookexternalhit/1.1" "https://domain-lo.com/?tab=Projects&article=ID_ARTIKEL"
//    dan cek apakah <title>/og:title di HTML yang balik udah sesuai artikelnya.

// Daftar User-Agent bot/crawler share & search yang perlu dikasih HTML dengan meta tag
// udah bener (server-side rendered dikit). Kalau nemu bot lain yang preview-nya masih
// generic, tinggal tambahin pattern-nya di sini.
const BOT_UA_REGEX =
  /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot|SkypeUriPreview|Discordbot|Pinterest|vkShare|redditbot|Applebot|Googlebot|bingbot/i;

// ID baris data di tabel `portfolio` — HARUS SAMA PERSIS kayak PORTFOLIO_ROW_ID di
// src/App.jsx. Kalau lo pernah ganti itu, ganti juga di sini.
const PORTFOLIO_ROW_ID = 1;

const SITE_NAME = 'Haikal A. Hafidz — Indie Writer';

function escapeAttr(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Timpa tag-tag yang UDAH ADA di index.html (title, description, og:*, twitter:*) pake
// regex replace-in-place, dan SISIPIN og:image/twitter:image (yang belum ada di
// index.html default) tepat setelah og:url / twitter:description.
function injectMeta(html, { title, description, image, url }) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const desc = escapeAttr(description || '');
  const safeTitle = escapeAttr(fullTitle);
  const safeUrl = escapeAttr(url || '');
  const safeImage = image ? escapeAttr(image) : '';

  let out = html;

  out = out.replace(/<title>.*?<\/title>/s, `<title>${safeTitle}</title>`);

  out = out.replace(
    /<meta name="description" content=".*?"\s*\/>/,
    `<meta name="description" content="${desc}" />`
  );

  out = out.replace(
    /<meta property="og:title" content=".*?"\s*\/>/,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  out = out.replace(
    /<meta property="og:description" content=".*?"\s*\/>/,
    `<meta property="og:description" content="${desc}" />`
  );
  out = out.replace(
    /<meta property="og:url" content=".*?"\s*\/>/,
    `<meta property="og:url" content="${safeUrl}" />` +
      (safeImage ? `\n    <meta property="og:image" content="${safeImage}" />` : '')
  );

  out = out.replace(
    /<meta name="twitter:card" content=".*?"\s*\/>/,
    `<meta name="twitter:card" content="${safeImage ? 'summary_large_image' : 'summary'}" />`
  );
  out = out.replace(
    /<meta name="twitter:title" content=".*?"\s*\/>/,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );
  out = out.replace(
    /<meta name="twitter:description" content=".*?"\s*\/>/,
    `<meta name="twitter:description" content="${desc}" />` +
      (safeImage ? `\n    <meta name="twitter:image" content="${safeImage}" />` : '')
  );

  return out;
}

export default async (request, context) => {
  const userAgent = request.headers.get('user-agent') || '';

  // Bukan bot share/crawler → jalan normal, jangan disentuh sama sekali (biar gak ada
  // latency tambahan buat pengunjung asli).
  if (!BOT_UA_REGEX.test(userAgent)) return context.next();

  const url = new URL(request.url);
  const tab = url.searchParams.get('tab');
  const articleId = url.searchParams.get('article');

  // Cuma kasus "bot minta preview satu artikel Projects spesifik" yang perlu di-rewrite.
  // Selain itu (Home/About/dst, atau Projects tanpa artikel), meta statis default di
  // index.html udah cukup representatif, gak perlu query Supabase.
  if (tab !== 'Projects' || !articleId) return context.next();

  const response = await context.next();
  const html = await response.text();

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

  // Env var belum di-set di Netlify dashboard → jangan sampe request-nya gagal total,
  // tetep serve HTML default apa adanya.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html, { status: response.status, headers });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/portfolio?id=eq.${PORTFOLIO_ROW_ID}&select=data`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const rows = await res.json();
    const articles = rows?.[0]?.data?.projects?.articles || [];
    const article = articles.find((a) => a.id === articleId);

    const headers = new Headers(response.headers);
    headers.delete('content-length'); // panjang HTML berubah abis di-rewrite

    if (!article) {
      // Artikel gak ketemu (mis. ID salah/udah dihapus) → serve default apa adanya.
      return new Response(html, { status: response.status, headers });
    }

    const rewritten = injectMeta(html, {
      title: article.title,
      description: article.snippet,
      image: article.image,
      url: request.url,
    });

    return new Response(rewritten, { status: response.status, headers });
  } catch (err) {
    // Supabase gagal diakses / response-nya gak sesuai ekspektasi → jangan sampe bikin
    // request bot ini error/kosong, fallback ke HTML default.
    console.error('Gagal rewrite meta tag buat bot:', err);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html, { status: response.status, headers });
  }
};

export const config = { path: '/*' };