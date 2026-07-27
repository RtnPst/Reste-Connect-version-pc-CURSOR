import sharp from "sharp";
import fs from "fs";
import path from "path";

const out = "store/play";
fs.mkdirSync(path.join(out, "screenshots"), { recursive: true });

const src = "public/icon-512.png";
await sharp(src).resize(512, 512, { fit: "cover" }).png().toFile(path.join(out, "icon-512.png"));
await sharp(src).resize(192, 192, { fit: "cover" }).png().toFile(path.join(out, "icon-192.png"));

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="55%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#g)"/>
  <text x="72" y="230" fill="#f8fafc" font-family="Arial,sans-serif" font-size="72" font-weight="700">Tu Captes ?</text>
  <text x="72" y="300" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="32">Le fil culturel francais</text>
</svg>`);
await sharp(svg).png().toFile(path.join(out, "feature-graphic-1024x500.png"));

fs.writeFileSync(
  path.join(out, "README.md"),
  `# Play Store assets

- \`icon-512.png\` — high-res icon (exact 512×512)
- \`feature-graphic-1024x500.png\`
- \`screenshots/\` — add ≥4 phone screenshots:
  Accueil, fil du jour, angle / époque, « Tu as capté »

Privacy URL: \`https://<domaine>/privacy\`
Delete account: \`https://<domaine>/delete-account\`

See also \`PLAYSTORE_READY.md\` and \`docs/release/DOMAIN_CUTOVER.md\`.
`,
);

console.log("store/play assets written");
