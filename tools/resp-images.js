// tools/resp-images.js
// Генератор responsive-изображений с AVIF(4:4:4) + WebP, логирует реальные размеры.
// Папки под твой проект: IN = src/img/raw, OUT = /webp (как у тебя на хостинге).

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const sharp = require('sharp');

const IN  = path.resolve('src/img/raw');   // исходники
const OUT = path.resolve('webp');          // куда кладём (у тебя живёт /webp)

const cfg = {
  // Профили размеров по типам
  hero:    [768, 1024, 1366, 1600, 1920, 2560],
  preview: [320, 480, 640, 768, 1024, 1366],
  brand:   [88, 176],
  generic: [320, 480, 640, 768, 1024, 1366, 1600, 1920]
};

// Определяем профиль по пути
function profileFor(fileAbs) {
  const rel = path.relative(IN, fileAbs).replace(/\\/g, '/');
  if (/\/hero\//i.test(rel))    return { widths: cfg.hero,    kind: 'hero' };
  if (/\/preview\//i.test(rel)) return { widths: cfg.preview, kind: 'preview' };
  if (/\/brand\//i.test(rel))   return { widths: cfg.brand,   kind: 'brand' };
  return { widths: cfg.generic, kind: 'generic' };
}

// Настройки качества: повышаем для HERO, включаем 4:4:4 для ровных краёв с альфой
function encoders(kind) {
  const isHero = kind === 'hero';
  return {
    avif: {
      quality: isHero ? 62 : 50,          // для героя мягче градиенты
      effort: 4,
      chromaSubsampling: '4:4:4',         // ключ от цветной бахромы по краю альфы
    },
    webp: isHero ? {
      quality: 90,
      alphaQuality: 100,
      nearLossless: 90,
      effort: 5,
      chromaSubsampling: '4:4:4'
    } : {
      quality: 65,
      effort: 4
    }
  };
}

// Вычисляем путь OUT: hero/master-1600.avif
function outPath(absIn, width, ext) {
  const rel   = path.relative(IN, absIn).replace(/\\/g, '/'); // hero/master.png
  const dir   = path.dirname(rel).split('/').pop();           // hero
  const name  = path.parse(rel).name;                         // master
  const outDir = path.join(OUT, dir);
  return { file: path.join(outDir, `${name}-${width}.${ext}`), outDir };
}

// Безопасное чтение встроенного ICC (держим sRGB)
function addMetadata(pipeline) {
  return pipeline.withMetadata(); // Sharp сам сохранит ICC, если есть
}

// Resize с учётом EXIF поворота, без апскейла
function basePipeline(buf, width, kernel) {
  return sharp(buf)
    .rotate() // уважаем EXIF Orientation
    .resize({ width, withoutEnlargement: true, kernel }); // без апскейла
}

// Для логов — читаем реальный размер файла после записи
async function metaOf(file) {
  try {
    const m = await sharp(file).metadata();
    const st = await fsp.stat(file);
    return `${path.basename(file)} → ${m.width}x${m.height} • ${Math.round(st.size/1024)} KiB`;
  } catch {
    return `${path.basename(file)} → (no meta)`;
  }
}

async function processOne(absIn) {
  const { widths, kind } = profileFor(absIn);
  const enc = encoders(kind);
  const buf = await fsp.readFile(absIn);

  for (const w of widths) {
    // Для логотипов меньше артефактов с cubic/mitchell
    const kernel = (kind === 'brand') ? 'mitchell' : 'lanczos3';

    const { file: avifOut, outDir } = outPath(absIn, w, 'avif');
    await fsp.mkdir(outDir, { recursive: true });

    // AVIF
    try {
      await addMetadata(basePipeline(buf, w, kernel))
        .toFormat('avif', enc.avif)
        .toFile(avifOut);
      console.log('AVIF ', await metaOf(avifOut));
    } catch (e) {
      console.warn('AVIF FAIL:', avifOut, e.message);
    }

    // WebP (страховка)
    const { file: webpOut } = outPath(absIn, w, 'webp');
    try {
      await addMetadata(basePipeline(buf, w, kernel))
        .toFormat('webp', enc.webp)
        .toFile(webpOut);
      console.log('WEBP ', await metaOf(webpOut));
    } catch (e) {
      console.error('WEBP FAIL:', webpOut, e.message);
      throw e;
    }
  }
}

async function walk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (/\.(png|jpe?g|webp|avif)$/i.test(e.name)) {
      await processOne(p);
    }
  }
}

(async function main() {
  try {
    console.log('sharp:', sharp.versions);
    console.log('formats:', sharp.format);
    await walk(IN);
    console.log('✅ Done. Output:', OUT);
  } catch (e) {
    console.error('❌ Build failed:', e);
    process.exit(1);
  }
})();

// tools/build-images.js
import sharp from "sharp";
const jobs = [
  { in: "src/webp/master-1920.webp",  base: "master-portrait", sizes:[600,1200] },
  { in: "src/webp/cosmetic.avif",     base: "cosmetic",         sizes:[600,1200] },
  { in: "src/webp/l-640.avif",        base: "l",                sizes:[480,960]  },
  { in: "src/png/brand1@2x.png",      base: "brand1",           sizes:[180,360]  },
];
for (const j of jobs){
  for (const w of j.sizes){
    await sharp(j.in).resize({ width:w }).avif({ quality:48 }).toFile(`public/img/${j.base}-${w}.avif`);
    await sharp(j.in).resize({ width:w }).webp({ quality:62 }).toFile(`public/img/${j.base}-${w}.webp`);
  }
}
console.log("✓ images ready");

import sharp from "sharp";
const jobs = [
  // master (портрет 2:3)
  { in:"src/webp/master-1920.webp", out:"public/img/master-2x3", sizes:[600,900,1200], ratio:null },
  // logo (растровый, если нет SVG)
  { in:"src/png/brand1@2x.png",    out:"public/img/brand1",     sizes:[176,352],      ratio:1 },
  // cosmetic
  { in:"src/webp/cosmetic.avif",   out:"public/img/cosmetic",   sizes:[600,1200],     ratio:600/381 },
  // l-640
  { in:"src/webp/l-640.avif",      out:"public/img/l",          sizes:[480,960],      ratio:480/320 },
];

for (const j of jobs) {
  for (const w of j.sizes) {
    const pipe = sharp(j.in);
    if (j.ratio) {
      const h = Math.round(w / j.ratio);
      pipe.resize({ width:w, height:h, fit:"cover" });
    } else {
      pipe.resize({ width:w });
    }
    await pipe.clone().avif({ quality:48 }).toFile(`${j.out}-${w}.avif`);
    await pipe.clone().webp({ quality:62 }).toFile(`${j.out}-${w}.webp`);
  }
}
console.log("✓ images optimized");



