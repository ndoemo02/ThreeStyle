import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// One RGBA atlas shared by paint, posters and floor marks; no extra PBR maps.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dots = Array.from({ length: 110 }, (_, i) => {
  const x = 25 + (i * 127 % 970), y = 30 + (i * 73 % 455);
  return `<circle cx="${x}" cy="${y}" r="${1 + i % 3}" fill="${i % 3 ? '#e9dcc4' : '#db8850'}" opacity=".65"/>`;
}).join('');
const poster = (x, y, title, subtitle, color, pattern) => `<g transform="translate(${x} ${y})">
 <rect x="14" y="14" width="484" height="228" rx="3" fill="#202b2d"/>
 <path d="M28 20H492V233H20Z" fill="none" stroke="${color}" stroke-width="3"/>
 <path d="${pattern}" fill="none" stroke="${color}" stroke-width="5"/>
 <text x="40" y="72" font-family="Arial,sans-serif" font-size="30" font-weight="bold" fill="#f2e4cf">${title}</text>
 <text x="40" y="214" font-family="Arial,sans-serif" font-size="19" letter-spacing="3" fill="#f2e4cf">${subtitle}</text>
 <path d="M8 40L55 8M453 247L505 210" stroke="#dfccaa" stroke-width="15"/>
 </g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
 <g>
 <path d="M58 400L904 111M132 473L965 206M50 244L843 47" stroke="#548c87" stroke-width="35" opacity=".82"/>
 <path d="M99 340L856 128M178 421L925 180" stroke="#28383b" stroke-width="60"/>
 <g fill="none" stroke-linecap="square" stroke-linejoin="round">
  <path d="M247 122C415 66 559 113 408 226C605 219 571 370 338 415" stroke="#ecdfc8" stroke-width="44"/>
  <path d="M846 115C671 66 591 178 766 248C928 301 785 422 582 393" stroke="#ecdfc8" stroke-width="44"/>
  <path d="M237 140L408 114M335 399L457 342M624 376L765 397M688 109L806 130" stroke="#c9bfae" stroke-width="7"/>
  <path d="M88 430L966 354" stroke="#dc8346" stroke-width="14"/>
  <path d="M82 143L96 57L133 118L162 43L179 134Z" stroke="#dc8346" stroke-width="9"/>
  <path d="M890 69L957 92M927 43L915 115" stroke="#eddfc8" stroke-width="7"/>
  <path d="M341 404V469M771 365V450M180 328V385" stroke="#ecdfc8" stroke-width="5"/>
 </g>
 <text x="218" y="63" font-family="Arial,sans-serif" font-size="23" letter-spacing="7" fill="#ecdfc8">TWÓJ STYL · TWOJE ZASADY</text>
 <text x="267" y="484" font-family="Arial,sans-serif" font-size="22" letter-spacing="9" fill="#dc8346">BLOK TRZECH PIĘTER</text>
 ${dots}
 </g>
 ${poster(0,512,'ZŁAP RYTM','POSŁUCHAJ. ZOSTAŃ CHWILĘ.','#db8850','M42 136H75L91 109L110 170L136 98L160 157L183 124H235L262 174L283 112L309 155L334 98L356 150H462')}
 ${poster(512,512,'TWÓJ GŁOS','TWÓJ POKÓJ. TWOJE MEDIA.','#71a8a2','M215 100V145Q215 178 255 178Q295 178 295 145V100M255 178V193M225 194H285M239 99Q255 86 271 99V146Q255 163 239 146Z')}
 ${poster(0,768,'ZOSTAW SWÓJ ŚLAD','THREESTYLE / FREESTYLE','#db8850','M62 164L150 105L140 169L213 107L224 171L279 112L315 173L393 102L380 176L457 117')}
 <g transform="translate(512 768)" fill="none" stroke="#db8850" stroke-width="14"><path d="M120 128H398M120 128L190 66M120 128L190 190"/></g>
 </svg>`;
const output = path.join(root,'public/textures/runtime/lobby');
await fs.mkdir(path.join(output,'shared'), {recursive:true});
await fs.mkdir(path.join(output,'low'), {recursive:true});
await sharp(Buffer.from(svg)).webp({quality:93,alphaQuality:100,effort:6}).toFile(path.join(output,'shared/character.webp'));
await sharp(Buffer.from(svg)).resize(512,512).webp({quality:90,alphaQuality:100,effort:6}).toFile(path.join(output,'low/character.webp'));
console.log('Lobby character: shared 1024², low 512²; one atlas per active profile.');
