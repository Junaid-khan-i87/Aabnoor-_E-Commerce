import { rejectLargeBody, setSecurityHeaders } from './_security';
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,follow" />
    <title>Page Not Found | Aabnoor Beaute</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f9f7f2;color:#1a1a1a;font-family:Arial,sans-serif}
      main{max-width:680px;padding:48px 24px;text-align:center}
      h1{margin:0 0 18px;font-family:Georgia,serif;font-size:clamp(40px,8vw,72px);font-style:italic;font-weight:400;line-height:.95}
      p{margin:0 auto 28px;max-width:520px;color:rgba(26,26,26,.68);line-height:1.7}
      nav{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
      a{border:1px solid rgba(26,26,26,.18);color:#1a1a1a;display:inline-block;font-size:11px;font-weight:700;letter-spacing:.16em;padding:13px 18px;text-decoration:none;text-transform:uppercase}
      a:hover{background:#1a1a1a;color:#f9f7f2}
    </style>
  </head>
  <body>
    <main>
      <h1>Page Not Found</h1>
      <p>The page you requested is not available. Continue shopping Aabnoor beauty essentials, review shipping details, or track an existing order.</p>
      <nav aria-label="Helpful links">
        <a href="/">Shop Beauty</a>
        <a href="/live-sale">Live Sale</a>
        <a href="/track">Track Order</a>
        <a href="/contact">Contact Support</a>
      </nav>
    </main>
  </body>
</html>`;

export default function handler(req: any, res: any) {
  setSecurityHeaders(res);
  if (rejectLargeBody(req, res)) return;
res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(404).send(html);
}
