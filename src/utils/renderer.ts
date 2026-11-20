import { COSMETIC_BY_ID } from '../data/cosmetics';
import {
  BODY_TYPE_CONFIGS,
  BodyType,
  Cloud,
  CosmeticCrate,
  CosmeticItem,
  ELEPHANT_RADIUS,
  ElephantState,
  EquippedCosmetics,
  FloatingText,
  GROUND_HEIGHT,
  Particle,
  PeanutBonus,
  PipePair,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../types/game';

interface RenderSceneParams {
  ctx: CanvasRenderingContext2D;
  elephant: ElephantState;
  bodyType: BodyType;
  equipped: EquippedCosmetics;
  hasShield: boolean;
  pipes: PipePair[];
  peanuts: PeanutBonus[];
  crates: CosmeticCrate[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  clouds: Cloud[];
  groundOffset: number;
  bgOffset: number;
  score: number;
  time: number;
  flashAlpha: number;
}

function adjustHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export interface BiomeTheme {
  id: string;
  name: string;
  badgeColor: string;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  celestialStyle: 'sun' | 'sunset' | 'crescent' | 'arctic' | 'volcanic' | 'cyber' | 'cosmic';
  sunColor: string;
  sunGlow: string;
  cloudTint: string;
  cloudOpacityMult: number;
  hillFar: string;
  hillNear: string;
  sceneryStyle: 'acacia' | 'sakura' | 'pine' | 'volcano' | 'cyber' | 'crystal';
  sceneryPrimary: string;
  sceneryAccent: string;
  ambientStyle: 'none' | 'dust' | 'sakura' | 'snow' | 'embers' | 'sparks' | 'cosmic';
  isNight: boolean;
  hasAurora: boolean;
  auroraColors: [string, string];
  pipeDark: string;
  pipeMid: string;
  pipeLight: string;
  pipeCapHighlight: string;
  pipeTrim: string | null;
  groundTop: string;
  groundStripe: string;
  groundStripeStyle: 'slanted' | 'grid' | 'cracks' | 'crystal';
  earthTop: string;
  earthMid: string;
  earthBottom: string;
  pebbleColor: string;
}

const BIOME_THEMES: BiomeTheme[] = [
  {
    id: 'savanna_day',
    name: 'Savan Sabahı',
    badgeColor: '#38BDF8',
    skyTop: '#0284C7',
    skyMid: '#7DD3FC',
    skyBottom: '#FEF3C7',
    celestialStyle: 'sun',
    sunColor: '#FEF08A',
    sunGlow: 'rgba(254, 240, 138, 0.34)',
    cloudTint: '255, 255, 255',
    cloudOpacityMult: 1,
    hillFar: '#60A5FA',
    hillNear: '#2E7D32',
    sceneryStyle: 'acacia',
    sceneryPrimary: '#1B5E20',
    sceneryAccent: '#4ADE80',
    ambientStyle: 'dust',
    isNight: false,
    hasAurora: false,
    auroraColors: ['#2DD4BF', '#A855F7'],
    pipeDark: '#14532D',
    pipeMid: '#22C55E',
    pipeLight: '#4ADE80',
    pipeCapHighlight: '#86EFAC',
    pipeTrim: null,
    groundTop: '#4ADE80',
    groundStripe: '#16A34A',
    groundStripeStyle: 'slanted',
    earthTop: '#D97706',
    earthMid: '#B45309',
    earthBottom: '#78350F',
    pebbleColor: 'rgba(254, 243, 199, 0.16)',
  },
  {
    id: 'golden_sunset',
    name: 'Altın Günbatımı',
    badgeColor: '#FB923C',
    skyTop: '#9A3412',
    skyMid: '#FB923C',
    skyBottom: '#FEF08A',
    celestialStyle: 'sunset',
    sunColor: '#FEF9C3',
    sunGlow: 'rgba(251, 146, 60, 0.42)',
    cloudTint: '254, 215, 170',
    cloudOpacityMult: 0.9,
    hillFar: '#B45309',
    hillNear: '#7C2D12',
    sceneryStyle: 'acacia',
    sceneryPrimary: '#431407',
    sceneryAccent: '#F59E0B',
    ambientStyle: 'dust',
    isNight: false,
    hasAurora: false,
    auroraColors: ['#F59E0B', '#EF4444'],
    pipeDark: '#78350F',
    pipeMid: '#D97706',
    pipeLight: '#FBBF24',
    pipeCapHighlight: '#FDE68A',
    pipeTrim: '#FEF08A',
    groundTop: '#FBBF24',
    groundStripe: '#D97706',
    groundStripeStyle: 'slanted',
    earthTop: '#B45309',
    earthMid: '#92400E',
    earthBottom: '#451A03',
    pebbleColor: 'rgba(254, 215, 170, 0.20)',
  },
  {
    id: 'sakura_valley',
    name: 'Kiraz Çiçeği Vadisi',
    badgeColor: '#F472B6',
    skyTop: '#4C1D95',
    skyMid: '#DB2777',
    skyBottom: '#FBCFE8',
    celestialStyle: 'crescent',
    sunColor: '#FFF1F2',
    sunGlow: 'rgba(244, 114, 182, 0.35)',
    cloudTint: '253, 224, 239',
    cloudOpacityMult: 0.72,
    hillFar: '#7E22CE',
    hillNear: '#581C87',
    sceneryStyle: 'sakura',
    sceneryPrimary: '#3B0764',
    sceneryAccent: '#F9A8D4',
    ambientStyle: 'sakura',
    isNight: true,
    hasAurora: false,
    auroraColors: ['#F472B6', '#C084FC'],
    pipeDark: '#831843',
    pipeMid: '#DB2777',
    pipeLight: '#F472B6',
    pipeCapHighlight: '#FBCFE8',
    pipeTrim: '#FDF2F8',
    groundTop: '#F472B6',
    groundStripe: '#BE185D',
    groundStripeStyle: 'slanted',
    earthTop: '#6B21A8',
    earthMid: '#581C87',
    earthBottom: '#3B0764',
    pebbleColor: 'rgba(251, 207, 232, 0.20)',
  },
  {
    id: 'frozen_glacier',
    name: 'Buzul Diyarı',
    badgeColor: '#67E8F9',
    skyTop: '#0F172A',
    skyMid: '#0284C7',
    skyBottom: '#E0F2FE',
    celestialStyle: 'arctic',
    sunColor: '#E0F2FE',
    sunGlow: 'rgba(103, 232, 249, 0.36)',
    cloudTint: '224, 242, 254',
    cloudOpacityMult: 0.85,
    hillFar: '#38BDF8',
    hillNear: '#0369A1',
    sceneryStyle: 'pine',
    sceneryPrimary: '#0C4A6E',
    sceneryAccent: '#F0F9FF',
    ambientStyle: 'snow',
    isNight: false,
    hasAurora: true,
    auroraColors: ['#22D3EE', '#A5F3FC'],
    pipeDark: '#0369A1',
    pipeMid: '#06B6D4',
    pipeLight: '#67E8F9',
    pipeCapHighlight: '#ECFEFF',
    pipeTrim: '#E0F2FE',
    groundTop: '#F0F9FF',
    groundStripe: '#7DD3FC',
    groundStripeStyle: 'slanted',
    earthTop: '#0284C7',
    earthMid: '#0369A1',
    earthBottom: '#082F49',
    pebbleColor: 'rgba(224, 242, 254, 0.25)',
  },
  {
    id: 'volcanic_inferno',
    name: 'Volkanik Cehennem',
    badgeColor: '#F97316',
    skyTop: '#180505',
    skyMid: '#7F1D1D',
    skyBottom: '#EA580C',
    celestialStyle: 'volcanic',
    sunColor: '#FDBA74',
    sunGlow: 'rgba(239, 68, 68, 0.45)',
    cloudTint: '127, 29, 29',
    cloudOpacityMult: 0.55,
    hillFar: '#450A0A',
    hillNear: '#1C1917',
    sceneryStyle: 'volcano',
    sceneryPrimary: '#0C0A09',
    sceneryAccent: '#F97316',
    ambientStyle: 'embers',
    isNight: true,
    hasAurora: false,
    auroraColors: ['#EF4444', '#F97316'],
    pipeDark: '#1C1917',
    pipeMid: '#44403C',
    pipeLight: '#78716C',
    pipeCapHighlight: '#F97316',
    pipeTrim: '#EF4444',
    groundTop: '#EA580C',
    groundStripe: '#7C2D12',
    groundStripeStyle: 'cracks',
    earthTop: '#292524',
    earthMid: '#1C1917',
    earthBottom: '#09090B',
    pebbleColor: 'rgba(249, 115, 22, 0.30)',
  },
  {
    id: 'cyber_neon',
    name: 'Siber Neon Şehri',
    badgeColor: '#22D3EE',
    skyTop: '#090D16',
    skyMid: '#311042',
    skyBottom: '#0E7490',
    celestialStyle: 'cyber',
    sunColor: '#22D3EE',
    sunGlow: 'rgba(232, 121, 249, 0.38)',
    cloudTint: '192, 132, 252',
    cloudOpacityMult: 0.3,
    hillFar: '#1E1B4B',
    hillNear: '#0F172A',
    sceneryStyle: 'cyber',
    sceneryPrimary: '#020617',
    sceneryAccent: '#22D3EE',
    ambientStyle: 'sparks',
    isNight: true,
    hasAurora: true,
    auroraColors: ['#22D3EE', '#E879F9'],
    pipeDark: '#0F172A',
    pipeMid: '#1E293B',
    pipeLight: '#334155',
    pipeCapHighlight: '#22D3EE',
    pipeTrim: '#E879F9',
    groundTop: '#06B6D4',
    groundStripe: '#0F172A',
    groundStripeStyle: 'grid',
    earthTop: '#1E1B4B',
    earthMid: '#0F172A',
    earthBottom: '#020617',
    pebbleColor: 'rgba(34, 211, 238, 0.25)',
  },
  {
    id: 'cosmic_galaxy',
    name: 'Kozmik Galaksi',
    badgeColor: '#C084FC',
    skyTop: '#020617',
    skyMid: '#1E1B4B',
    skyBottom: '#581C87',
    celestialStyle: 'cosmic',
    sunColor: '#FDE68A',
    sunGlow: 'rgba(168, 85, 247, 0.45)',
    cloudTint: '167, 139, 250',
    cloudOpacityMult: 0.25,
    hillFar: '#2E1065',
    hillNear: '#170B3B',
    sceneryStyle: 'crystal',
    sceneryPrimary: '#0F0728',
    sceneryAccent: '#C084FC',
    ambientStyle: 'cosmic',
    isNight: true,
    hasAurora: true,
    auroraColors: ['#34D399', '#A855F7'],
    pipeDark: '#3B0764',
    pipeMid: '#7E22CE',
    pipeLight: '#A855F7',
    pipeCapHighlight: '#FDE047',
    pipeTrim: '#FACC15',
    groundTop: '#A855F7',
    groundStripe: '#6B21A8',
    groundStripeStyle: 'crystal',
    earthTop: '#312E81',
    earthMid: '#1E1B4B',
    earthBottom: '#090420',
    pebbleColor: 'rgba(250, 204, 21, 0.28)',
  },
];

export function getBiomeTheme(score: number): BiomeTheme {
  if (score >= 80) return BIOME_THEMES[6];
  if (score >= 65) return BIOME_THEMES[5];
  if (score >= 50) return BIOME_THEMES[4];
  if (score >= 36) return BIOME_THEMES[3];
  if (score >= 24) return BIOME_THEMES[2];
  if (score >= 12) return BIOME_THEMES[1];
  return BIOME_THEMES[0];
}

export function renderGameScene({
  ctx,
  elephant,
  bodyType,
  equipped,
  hasShield,
  pipes,
  peanuts,
  crates,
  particles,
  floatingTexts,
  clouds,
  groundOffset,
  bgOffset,
  score,
  time,
  flashAlpha,
}: RenderSceneParams) {
  const biome = getBiomeTheme(score);
  const playableHeight = WORLD_HEIGHT - GROUND_HEIGHT;

  // 1. Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, playableHeight);
  skyGrad.addColorStop(0, biome.skyTop);
  skyGrad.addColorStop(0.6, biome.skyMid);
  skyGrad.addColorStop(1, biome.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, WORLD_WIDTH, playableHeight);

  // Night stars & shooting stars
  if (biome.isNight) {
    const starCount = biome.id === 'cosmic_galaxy' ? 56 : 30;
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < starCount; i++) {
      const sx = (i * 137 + 29) % WORLD_WIDTH;
      const sy = ((i * 73 + 17) % (playableHeight * 0.62)) + 14;
      const twinkle = 0.45 + 0.55 * Math.sin(time * (2.2 + (i % 3)) + i);
      ctx.globalAlpha = twinkle * (biome.id === 'volcanic_inferno' ? 0.35 : 0.9);
      ctx.beginPath();
      ctx.arc(sx, sy, i % 4 === 0 ? 2 : 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (biome.id === 'cosmic_galaxy' || biome.id === 'sakura_valley') {
      const shootPhase = (time * 0.35) % 1;
      if (shootPhase < 0.25) {
        const progress = shootPhase / 0.25;
        const sx = WORLD_WIDTH * (0.85 - progress * 0.55);
        const sy = 36 + progress * 90;
        ctx.save();
        const trail = ctx.createLinearGradient(sx, sy, sx + 55, sy - 22);
        trail.addColorStop(0, 'rgba(255,255,255,0.95)');
        trail.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = trail;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 55, sy - 22);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Aurora Borealis wave ribbons
  if (biome.hasAurora) {
    ctx.save();
    for (let band = 0; band < 2; band++) {
      const grad = ctx.createLinearGradient(0, 28 + band * 26, 0, 145 + band * 24);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, band === 0 ? biome.auroraColors[0] : biome.auroraColors[1]);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 95 + band * 25);
      for (let x = 0; x <= WORLD_WIDTH; x += 40) {
        const y =
          70 +
          band * 24 +
          Math.sin(x * 0.008 + time * (1.1 + band * 0.4) + band) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(WORLD_WIDTH, 160 + band * 20);
      ctx.lineTo(0, 160 + band * 20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 2. Celestial Body (Sun / Sunset / Crescent Moon / Eclipse / Cyber Sun / Ringed Planet)
  drawCelestialBody(ctx, biome, time);

  // 3. Clouds
  for (const cloud of clouds) {
    drawCloud(
      ctx,
      cloud.x,
      cloud.y,
      cloud.scale,
      cloud.opacity * biome.cloudOpacityMult,
      biome.cloudTint
    );
  }

  // 4. Parallax Hills
  drawHills(ctx, bgOffset * 0.25, playableHeight, biome.hillFar, 68, 240);
  drawHills(ctx, bgOffset * 0.5, playableHeight, biome.hillNear, 38, 170);

  // 5. Biome Scenery Silhouettes (Acacia / Sakura / Frost Pines / Volcano Spires / Cyber Skyline / Cosmic Crystals)
  drawBiomeScenery(ctx, bgOffset * 0.65, playableHeight, biome, time);

  // 5.5 Ambient Weather / Atmosphere Particles behind gameplay layer
  drawBiomeAtmosphere(ctx, biome, playableHeight, time);

  // 6. Pipes
  for (const pipe of pipes) {
    drawPipePair(ctx, pipe, playableHeight, biome);
  }

  // 7. Peanuts
  for (const peanut of peanuts) {
    if (!peanut.collected) {
      drawPeanut(ctx, peanut, time);
    }
  }

  // 8. Cosmetic Crates
  for (const crate of crates) {
    if (!crate.collected) {
      drawCosmeticCrate(ctx, crate, time);
    }
  }

  // 9. Ground
  drawGround(ctx, groundOffset, playableHeight, biome);

  // 10. Particles
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.type === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.4 - alpha * 0.4), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.type === 'puff' ? 1.4 - alpha * 0.4 : alpha), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 11. Elephant
  drawElephant(ctx, elephant, bodyType, equipped, hasShield, time);

  // 12. Floating Texts
  for (const ft of floatingTexts) {
    const alpha = Math.max(0, ft.life / ft.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '800 18px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0F172A';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  // 13. Collision Flash
  if (flashAlpha > 0.01) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }
}

function drawCelestialBody(ctx: CanvasRenderingContext2D, biome: BiomeTheme, time: number) {
  const cx = WORLD_WIDTH * 0.78;
  const cy = biome.celestialStyle === 'sunset' ? 165 : biome.isNight ? 92 : 112;

  ctx.save();
  ctx.fillStyle = biome.sunGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 62 + Math.sin(time * 2) * 3, 0, Math.PI * 2);
  ctx.fill();

  if (biome.celestialStyle === 'crescent') {
    ctx.fillStyle = biome.sunColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = biome.skyTop;
    ctx.beginPath();
    ctx.arc(cx + 10, cy - 6, 23, 0, Math.PI * 2);
    ctx.fill();
  } else if (biome.celestialStyle === 'volcanic') {
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#180505';
    ctx.beginPath();
    ctx.arc(cx, cy, 27, 0, Math.PI * 2);
    ctx.fill();
  } else if (biome.celestialStyle === 'cyber') {
    const cyberGrad = ctx.createLinearGradient(cx, cy - 36, cx, cy + 36);
    cyberGrad.addColorStop(0, '#FDE047');
    cyberGrad.addColorStop(0.55, '#EC4899');
    cyberGrad.addColorStop(1, '#22D3EE');
    ctx.fillStyle = cyberGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = biome.skyTop;
    for (let s = 0; s < 4; s++) {
      ctx.fillRect(cx - 38, cy + 6 + s * 7, 76, 2.5);
    }
  } else if (biome.celestialStyle === 'cosmic') {
    ctx.fillStyle = '#A855F7';
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 52, 12, -0.25, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = biome.sunColor;
    ctx.beginPath();
    ctx.arc(cx, cy, biome.celestialStyle === 'sunset' ? 42 : 32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  opacity: number,
  rgbTint: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = `rgba(${rgbTint}, ${opacity})`;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.arc(22, -6, 26, 0, Math.PI * 2);
  ctx.arc(48, 0, 20, 0, Math.PI * 2);
  ctx.arc(24, 8, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  offset: number,
  groundY: number,
  color: string,
  height: number,
  wavelength: number
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  const start = -(offset % wavelength);
  for (let x = start - wavelength; x <= WORLD_WIDTH + wavelength; x += wavelength) {
    ctx.quadraticCurveTo(x + wavelength * 0.5, groundY - height, x + wavelength, groundY);
  }
  ctx.lineTo(WORLD_WIDTH, groundY);
  ctx.closePath();
  ctx.fill();
}

function drawBiomeScenery(
  ctx: CanvasRenderingContext2D,
  offset: number,
  groundY: number,
  biome: BiomeTheme,
  time: number
) {
  const spacing = biome.sceneryStyle === 'cyber' ? 230 : 300;
  const start = -(offset % spacing);

  for (let x = start - spacing; x <= WORLD_WIDTH + spacing; x += spacing) {
    const anchorX = x + 90;
    if (biome.sceneryStyle === 'acacia' || biome.sceneryStyle === 'sakura') {
      const trunkH = 44;
      ctx.strokeStyle = biome.sceneryPrimary;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(anchorX, groundY);
      ctx.lineTo(anchorX, groundY - trunkH);
      ctx.moveTo(anchorX, groundY - trunkH + 16);
      ctx.lineTo(anchorX - 18, groundY - trunkH - 4);
      ctx.moveTo(anchorX, groundY - trunkH + 12);
      ctx.lineTo(anchorX + 20, groundY - trunkH - 2);
      ctx.stroke();

      ctx.fillStyle =
        biome.sceneryStyle === 'sakura' ? biome.sceneryAccent : biome.sceneryPrimary;
      ctx.beginPath();
      ctx.ellipse(anchorX, groundY - trunkH - 6, 38, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(anchorX - 18, groundY - trunkH - 2, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(anchorX + 20, groundY - trunkH - 1, 20, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (biome.sceneryStyle === 'pine') {
      ctx.fillStyle = biome.sceneryPrimary;
      ctx.beginPath();
      ctx.moveTo(anchorX, groundY - 78);
      ctx.lineTo(anchorX - 24, groundY - 10);
      ctx.lineTo(anchorX + 24, groundY - 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(anchorX - 4, groundY - 12, 8, 12);
      // Snow cap
      ctx.fillStyle = biome.sceneryAccent;
      ctx.beginPath();
      ctx.moveTo(anchorX, groundY - 78);
      ctx.lineTo(anchorX - 11, groundY - 48);
      ctx.lineTo(anchorX + 11, groundY - 48);
      ctx.closePath();
      ctx.fill();
    } else if (biome.sceneryStyle === 'volcano') {
      ctx.fillStyle = biome.sceneryPrimary;
      ctx.beginPath();
      ctx.moveTo(anchorX - 42, groundY);
      ctx.lineTo(anchorX - 10, groundY - 76);
      ctx.lineTo(anchorX + 10, groundY - 76);
      ctx.lineTo(anchorX + 44, groundY);
      ctx.closePath();
      ctx.fill();
      // Lava glow at crater rim
      ctx.strokeStyle = biome.sceneryAccent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(anchorX - 9, groundY - 75);
      ctx.lineTo(anchorX + 9, groundY - 75);
      ctx.stroke();
    } else if (biome.sceneryStyle === 'cyber') {
      const h1 = 76;
      const h2 = 54;
      ctx.fillStyle = biome.sceneryPrimary;
      ctx.fillRect(anchorX - 26, groundY - h1, 30, h1);
      ctx.fillRect(anchorX + 12, groundY - h2, 26, h2);
      ctx.fillStyle = biome.sceneryAccent;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 3 + x);
      for (let wy = 14; wy < h1 - 10; wy += 14) {
        ctx.fillRect(anchorX - 20, groundY - h1 + wy, 6, 4);
        ctx.fillRect(anchorX - 10, groundY - h1 + wy, 6, 4);
      }
      ctx.fillStyle = '#E879F9';
      ctx.fillRect(anchorX + 18, groundY - h2 + 10, 14, 3);
      ctx.fillRect(anchorX + 18, groundY - h2 + 22, 14, 3);
      ctx.globalAlpha = 1;
    } else if (biome.sceneryStyle === 'crystal') {
      ctx.fillStyle = biome.sceneryAccent;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.moveTo(anchorX - 14, groundY);
      ctx.lineTo(anchorX - 4, groundY - 64);
      ctx.lineTo(anchorX + 8, groundY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(anchorX + 4, groundY);
      ctx.lineTo(anchorX + 16, groundY - 44);
      ctx.lineTo(anchorX + 26, groundY);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawBiomeAtmosphere(
  ctx: CanvasRenderingContext2D,
  biome: BiomeTheme,
  playableHeight: number,
  time: number
) {
  if (biome.ambientStyle === 'none') return;
  ctx.save();
  const count = biome.ambientStyle === 'snow' || biome.ambientStyle === 'sakura' ? 24 : 18;

  for (let i = 0; i < count; i++) {
    const seedX = (i * 193 + 47) % WORLD_WIDTH;
    const speedY =
      biome.ambientStyle === 'embers'
        ? -(28 + (i % 4) * 10)
        : biome.ambientStyle === 'dust'
          ? 8 + (i % 3) * 4
          : 26 + (i % 4) * 11;
    const driftX = Math.sin(time * 1.6 + i * 1.3) * 24 - time * (16 + (i % 3) * 7);
    const px = (((seedX + driftX) % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH;
    const rawY = ((i * 89 + time * speedY) % playableHeight + playableHeight) % playableHeight;

    if (biome.ambientStyle === 'sakura') {
      ctx.fillStyle = i % 2 === 0 ? '#FBCFE8' : '#F472B6';
      ctx.globalAlpha = 0.78;
      ctx.save();
      ctx.translate(px, rawY);
      ctx.rotate(time * 2 + i);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.2, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (biome.ambientStyle === 'snow') {
      ctx.fillStyle = '#F0F9FF';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(px, rawY, i % 3 === 0 ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (biome.ambientStyle === 'embers') {
      ctx.fillStyle = i % 2 === 0 ? '#F97316' : '#FDE047';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(px, rawY, i % 3 === 0 ? 2.8 : 1.9, 0, Math.PI * 2);
      ctx.fill();
    } else if (biome.ambientStyle === 'sparks') {
      ctx.fillStyle = i % 2 === 0 ? '#22D3EE' : '#E879F9';
      ctx.globalAlpha = 0.65;
      ctx.fillRect(px, rawY, 4, 2);
    } else if (biome.ambientStyle === 'cosmic') {
      ctx.fillStyle = i % 2 === 0 ? '#C084FC' : '#FDE047';
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(px, rawY, 2.1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#FEF3C7';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(px, rawY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPipePair(
  ctx: CanvasRenderingContext2D,
  pipe: PipePair,
  playableHeight: number,
  biome: BiomeTheme
) {
  const capHeight = 26;
  const capOverhang = 6;

  const topHeight = Math.max(0, pipe.gapTop);
  if (topHeight > 0) {
    drawPipeSegment(ctx, pipe.x, 0, pipe.width, topHeight - capHeight, biome);
    drawPipeCap(
      ctx,
      pipe.x - capOverhang,
      topHeight - capHeight,
      pipe.width + capOverhang * 2,
      capHeight,
      biome
    );
  }

  const bottomY = pipe.gapTop + pipe.gapHeight;
  const bottomHeight = playableHeight - bottomY;
  if (bottomHeight > 0) {
    drawPipeCap(ctx, pipe.x - capOverhang, bottomY, pipe.width + capOverhang * 2, capHeight, biome);
    drawPipeSegment(ctx, pipe.x, bottomY + capHeight, pipe.width, bottomHeight - capHeight, biome);
  }
}

function drawPipeSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  biome: BiomeTheme
) {
  if (h <= 0) return;
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, biome.pipeDark);
  grad.addColorStop(0.22, biome.pipeLight);
  grad.addColorStop(0.45, biome.pipeMid);
  grad.addColorStop(0.85, biome.pipeDark);
  grad.addColorStop(1, adjustHex(biome.pipeDark, -15));

  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  if (biome.pipeTrim) {
    ctx.fillStyle = biome.pipeTrim;
    ctx.fillRect(x + 8, y, 4, h);
  }

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, w, h);
}

function drawPipeCap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  biome: BiomeTheme
) {
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, biome.pipeDark);
  grad.addColorStop(0.2, biome.pipeCapHighlight);
  grad.addColorStop(0.45, biome.pipeMid);
  grad.addColorStop(0.85, biome.pipeDark);
  grad.addColorStop(1, adjustHex(biome.pipeDark, -15));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();

  if (biome.pipeTrim) {
    ctx.fillStyle = biome.pipeTrim;
    ctx.fillRect(x + 4, y + h * 0.5 - 2, w - 8, 4);
  }

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.stroke();
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  groundOffset: number,
  groundY: number,
  biome: BiomeTheme
) {
  ctx.fillStyle = biome.groundTop;
  ctx.fillRect(0, groundY, WORLD_WIDTH, 16);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, groundY, WORLD_WIDTH, 16);
  ctx.clip();

  ctx.fillStyle = biome.groundStripe;
  const stripeW = 28;
  const start = -(groundOffset % (stripeW * 2));
  for (let x = start - stripeW * 2; x < WORLD_WIDTH + stripeW * 2; x += stripeW * 2) {
    if (biome.groundStripeStyle === 'grid') {
      ctx.fillRect(x + 6, groundY + 3, stripeW - 4, 10);
    } else if (biome.groundStripeStyle === 'crystal') {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 16);
      ctx.lineTo(x + stripeW * 0.5, groundY);
      ctx.lineTo(x + stripeW, groundY + 16);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 16);
      ctx.lineTo(x + 12, groundY);
      ctx.lineTo(x + 12 + stripeW, groundY);
      ctx.lineTo(x + stripeW, groundY + 16);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(WORLD_WIDTH, groundY);
  ctx.stroke();

  const earthGrad = ctx.createLinearGradient(0, groundY + 16, 0, WORLD_HEIGHT);
  earthGrad.addColorStop(0, biome.earthTop);
  earthGrad.addColorStop(0.25, biome.earthMid);
  earthGrad.addColorStop(1, biome.earthBottom);
  ctx.fillStyle = earthGrad;
  ctx.fillRect(0, groundY + 16, WORLD_WIDTH, GROUND_HEIGHT - 16);

  ctx.fillStyle = biome.pebbleColor;
  const pebbleSpacing = 64;
  const pStart = -(groundOffset % pebbleSpacing);
  for (let x = pStart - pebbleSpacing; x < WORLD_WIDTH + pebbleSpacing; x += pebbleSpacing) {
    ctx.beginPath();
    ctx.ellipse(x + 18, groundY + 38, 7, 3.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 48, groundY + 54, 5, 2.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPeanut(ctx: CanvasRenderingContext2D, peanut: PeanutBonus, time: number) {
  const bob = Math.sin(time * 5 + peanut.bobPhase) * 5;
  const px = peanut.x;
  const py = peanut.y + bob;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(Math.sin(time * 3 + peanut.bobPhase) * 0.25);

  ctx.fillStyle = 'rgba(251, 191, 36, 0.28)';
  ctx.beginPath();
  ctx.arc(0, 0, peanut.radius + 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F59E0B';
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 2.2;

  ctx.beginPath();
  ctx.ellipse(-5, 0, 8.5, 7, -0.2, 0, Math.PI * 2);
  ctx.ellipse(5, 0, 8, 6.5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.ellipse(-5, -2.5, 4, 2, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCosmeticCrate(ctx: CanvasRenderingContext2D, crate: CosmeticCrate, time: number) {
  const bob = Math.sin(time * 4.2 + crate.bobPhase) * 6;
  const cx = crate.x;
  const cy = crate.y + bob;
  const half = crate.size / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(time * 2.5 + crate.bobPhase) * 0.12);

  const pulse = 1 + Math.sin(time * 6) * 0.12;
  ctx.fillStyle = 'rgba(168, 85, 247, 0.30)';
  ctx.beginPath();
  ctx.arc(0, 0, half * 1.55 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#9333EA';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(-half, -half, crate.size, crate.size, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FACC15';
  ctx.fillRect(-3.5, -half + 1, 7, crate.size - 2);
  ctx.fillRect(-half + 1, -3.5, crate.size - 2, 7);

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#FDE047';
  ctx.beginPath();
  ctx.ellipse(-6, -half - 3, 6, 4, -0.35, 0, Math.PI * 2);
  ctx.ellipse(6, -half - 3, 6, 4, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 13px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 0, 1);

  ctx.restore();
}

function getSuitLegColors(suitShape: string): { fill: string; stroke: string } {
  switch (suitShape) {
    case 'police':
      return { fill: '#1E3A8A', stroke: '#0F172A' };
    case 'astronaut_suit':
      return { fill: '#CBD5E1', stroke: '#475569' };
    case 'knight':
      return { fill: '#94A3B8', stroke: '#1E293B' };
    case 'superhero':
      return { fill: '#1D4ED8', stroke: '#0F172A' };
    case 'samurai':
      return { fill: '#7F1D1D', stroke: '#0F172A' };
    case 'pharaoh':
      return { fill: '#D97706', stroke: '#451A03' };
    case 'king_robe':
      return { fill: '#4C1D95', stroke: '#0F172A' };
    case 'doctor':
    case 'chef_suit':
      return { fill: '#334155', stroke: '#0F172A' };
    default:
      return { fill: '#0F172A', stroke: '#020617' };
  }
}

function drawElephantSuitOverlay(
  ctx: CanvasRenderingContext2D,
  suitShape: string,
  r: number
) {
  // 1. Clipped torso garment layered over body + lower ear
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(-2, 1, r + 2, r - 2, 0, 0, Math.PI * 2);
  ctx.clip();

  const drawBaseTorsoPath = (topY = -1) => {
    ctx.beginPath();
    ctx.moveTo(-28, topY + 2);
    ctx.quadraticCurveTo(-8, topY - 4, 8, topY + 2);
    ctx.lineTo(24, topY + 6);
    ctx.lineTo(24, 24);
    ctx.lineTo(-28, 24);
    ctx.closePath();
  };

  if (suitShape === 'tuxedo') {
    const suitGrad = ctx.createLinearGradient(-16, -4, 16, 22);
    suitGrad.addColorStop(0, '#1E293B');
    suitGrad.addColorStop(0.45, '#0F172A');
    suitGrad.addColorStop(1, '#020617');
    ctx.fillStyle = suitGrad;
    drawBaseTorsoPath(0);
    ctx.fill();

    // White dress shirt V-front
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(19, 4);
    ctx.lineTo(13, 21);
    ctx.lineTo(8, 21);
    ctx.closePath();
    ctx.fill();

    // Satin lapels
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.4;
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(1, 7);
    ctx.lineTo(8, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(19, 4);
    ctx.lineTo(22, 8);
    ctx.lineTo(13, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold studs & pocket square
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(11.5, 11.5, 1.35, 0, Math.PI * 2);
    ctx.arc(11.2, 16, 1.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.moveTo(-6, 9);
    ctx.lineTo(-2, 6);
    ctx.lineTo(1, 9);
    ctx.closePath();
    ctx.fill();
  } else if (suitShape === 'police') {
    ctx.fillStyle = '#1E3A8A';
    drawBaseTorsoPath(0);
    ctx.fill();

    // Crisp sky-blue collar & dark tie
    ctx.fillStyle = '#93C5FD';
    ctx.beginPath();
    ctx.moveTo(5, 2);
    ctx.lineTo(18, 4);
    ctx.lineTo(12, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(11, 4);
    ctx.lineTo(14, 4);
    ctx.lineTo(13.5, 16);
    ctx.lineTo(11, 18);
    ctx.lineTo(9.5, 16);
    ctx.closePath();
    ctx.fill();

    // Gold shoulder epaulettes & brass buttons + commissar badge
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-16, 1, 9, 3);
    ctx.beginPath();
    ctx.arc(1, 10, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(5, 14, 1.3, 0, Math.PI * 2);
    ctx.arc(5, 18.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (suitShape === 'pirate') {
    ctx.fillStyle = '#991B1B';
    drawBaseTorsoPath(0);
    ctx.fill();

    // Cream pirate shirt V & black leather sash with gold buckle
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.moveTo(5, 2);
    ctx.lineTo(18, 4);
    ctx.lineTo(12, 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-19, 1, 9, 3);

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(-26, 11);
    ctx.lineTo(24, 13);
    ctx.lineTo(24, 17);
    ctx.lineTo(-26, 15);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(2, 11.5, 5, 4);
  } else if (suitShape === 'doctor') {
    ctx.fillStyle = '#F8FAFC';
    drawBaseTorsoPath(0);
    ctx.fill();

    // Teal scrubs V-neck underneath
    ctx.fillStyle = '#0D9488';
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(18, 4);
    ctx.lineTo(12, 17);
    ctx.closePath();
    ctx.fill();

    // Lab coat lapels
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(5, 2);
    ctx.lineTo(11, 18);
    ctx.moveTo(18, 4);
    ctx.lineTo(12, 18);
    ctx.stroke();

    // Red medical cross pocket
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(-4, 9, 6, 2.2);
    ctx.fillRect(-2.1, 7.1, 2.2, 6);

    // Silver stethoscope around neck
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(9, 4, 7.5, 0.25, Math.PI * 0.95);
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.arc(3, 9.5, 2.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (suitShape === 'chef_suit') {
    ctx.fillStyle = '#FFFFFF';
    drawBaseTorsoPath(0);
    ctx.fill();

    // Double-breasted seam & dark buttons
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(6, 3);
    ctx.lineTo(5, 22);
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    for (const [bx, by] of [
      [3, 9],
      [3, 14],
      [9, 9],
      [9, 14],
    ]) {
      ctx.beginPath();
      ctx.arc(bx, by, 1.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Red chef neckerchief
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.moveTo(4, 1);
    ctx.lineTo(18, 3);
    ctx.lineTo(12, 8);
    ctx.closePath();
    ctx.fill();
  } else if (suitShape === 'astronaut_suit') {
    ctx.fillStyle = '#E2E8F0';
    drawBaseTorsoPath(-1);
    ctx.fill();

    // Orange NASA stripes & chest life-support module
    ctx.fillStyle = '#F97316';
    ctx.fillRect(-24, 6, 46, 3.2);
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.roundRect(-2, 9, 13, 9, 2);
    ctx.fill();
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(0.5, 11, 4, 2.5);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(6, 11, 3, 2.5);
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0.5, 14.5, 8.5, 1.8);
  } else if (suitShape === 'ninja') {
    ctx.fillStyle = '#0F172A';
    drawBaseTorsoPath(-1);
    ctx.fill();

    // Diagonal crimson katana strap & belt
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-18, 2);
    ctx.lineTo(14, 20);
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-26, 12, 50, 4);
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-26, 13, 50, 2);

    // Metallic throwing star badge
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.arc(5, 9, 2.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (suitShape === 'knight') {
    const steelGrad = ctx.createLinearGradient(-16, -2, 16, 20);
    steelGrad.addColorStop(0, '#E2E8F0');
    steelGrad.addColorStop(0.55, '#94A3B8');
    steelGrad.addColorStop(1, '#475569');
    ctx.fillStyle = steelGrad;
    drawBaseTorsoPath(-1);
    ctx.fill();

    // Plate seams & golden crest
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-22, 9);
    ctx.quadraticCurveTo(0, 12, 22, 9);
    ctx.moveTo(-20, 15);
    ctx.quadraticCurveTo(0, 18, 22, 15);
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(4, 6);
    ctx.lineTo(9, 8);
    ctx.lineTo(7, 13);
    ctx.lineTo(4, 15);
    ctx.lineTo(1, 13);
    ctx.lineTo(-1, 8);
    ctx.closePath();
    ctx.fill();
  } else if (suitShape === 'superhero') {
    ctx.fillStyle = '#2563EB';
    drawBaseTorsoPath(-1);
    ctx.fill();

    // Gold belt
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-26, 13, 50, 3.5);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(2, 12.5, 5, 4.5);

    // Heroic shield crest on chest
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(4, 5.5);
    ctx.lineTo(10, 7.5);
    ctx.lineTo(4, 12.5);
    ctx.lineTo(-2, 7.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (suitShape === 'samurai') {
    ctx.fillStyle = '#7F1D1D';
    drawBaseTorsoPath(-1);
    ctx.fill();

    // Gold-laced armor bands
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-26, 5, 50, 4);
    ctx.fillRect(-26, 12, 50, 4);
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-24, 5);
    ctx.lineTo(22, 5);
    ctx.moveTo(-24, 9);
    ctx.lineTo(22, 9);
    ctx.moveTo(-24, 12);
    ctx.lineTo(22, 12);
    ctx.moveTo(-24, 16);
    ctx.lineTo(22, 16);
    ctx.stroke();
  } else if (suitShape === 'cyber_suit') {
    ctx.fillStyle = '#111827';
    drawBaseTorsoPath(-1);
    ctx.fill();

    // Neon cyan & magenta glowing seams
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-24, 3);
    ctx.lineTo(-4, 8);
    ctx.lineTo(18, 6);
    ctx.moveTo(-14, 12);
    ctx.lineTo(14, 12);
    ctx.stroke();

    ctx.fillStyle = '#EC4899';
    ctx.beginPath();
    ctx.arc(6, 12, 2.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (suitShape === 'vampire') {
    ctx.fillStyle = '#1E1B4B';
    drawBaseTorsoPath(0);
    ctx.fill();

    // Crimson waistcoat & white cravat + ruby gem
    ctx.fillStyle = '#991B1B';
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.lineTo(18, 4);
    ctx.lineTo(14, 20);
    ctx.lineTo(6, 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(7, 3);
    ctx.lineTo(15, 4);
    ctx.lineTo(11, 11);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(11, 7, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (suitShape === 'pharaoh') {
    const goldGrad = ctx.createLinearGradient(-16, -2, 16, 20);
    goldGrad.addColorStop(0, '#FDE047');
    goldGrad.addColorStop(0.5, '#F59E0B');
    goldGrad.addColorStop(1, '#B45309');
    ctx.fillStyle = goldGrad;
    drawBaseTorsoPath(-1);
    ctx.fill();

    // Lapis & turquoise concentric Usekh broad collar
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(4, 0, 9.5, 0.2, Math.PI - 0.15);
    ctx.stroke();
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(4, 0, 14, 0.25, Math.PI - 0.2);
    ctx.stroke();

    // Scarab gem
    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.ellipse(5, 11, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (suitShape === 'king_robe') {
    ctx.fillStyle = '#581C87';
    drawBaseTorsoPath(0);
    ctx.fill();

    // Heavy royal gold chain & ruby centerpiece
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(3, 3, 9, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(4, 12, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Ermine white bottom border trim
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-26, 15, 50, 7);
    ctx.fillStyle = '#0F172A';
    for (let sx = -18; sx <= 16; sx += 8) {
      ctx.beginPath();
      ctx.arc(sx, 18, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  // 2. Tailored Collar / Neckline Seam ON TOP of body+ear seam (unclipped so collars look crisp!)
  ctx.save();
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.1;

  if (suitShape === 'tuxedo') {
    // Upper collar rim over tucked ear + Crimson Bow Tie
    ctx.beginPath();
    ctx.moveTo(-21, 1);
    ctx.quadraticCurveTo(-5, -2, 8, 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(12, 5.5);
    ctx.fillStyle = '#DC2626';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-5.5, -3.5);
    ctx.lineTo(-5.5, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(5.5, -3.5);
    ctx.lineTo(5.5, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, 0, 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (suitShape === 'vampire') {
    // High spiked Dracula collar framing neck & ear
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.lineTo(-17, -9);
    ctx.lineTo(-3, 0);
    ctx.lineTo(13, 4);
    ctx.lineTo(5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (suitShape === 'king_robe') {
    // Fluffy white ermine fur collar
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(-14, -2, 28, 7, 3.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0F172A';
    for (const sx of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.arc(sx, 1.5, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (suitShape === 'astronaut_suit') {
    // Metallic EVA neck ring
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.roundRect(-12, -2, 27, 6, 3);
    ctx.fill();
    ctx.stroke();
  } else if (suitShape === 'cyber_suit') {
    // Glowing techwear high collar
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.lineTo(-15, -6);
    ctx.lineTo(13, 3);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Clean tailored shoulder/collar seam for all other suits
    ctx.beginPath();
    ctx.moveTo(-21, 1);
    ctx.quadraticCurveTo(-5, -2, 13, 3.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawElephant(
  ctx: CanvasRenderingContext2D,
  elephant: ElephantState,
  bodyType: BodyType,
  equipped: EquippedCosmetics,
  hasShield: boolean,
  time: number
) {
  const bodyCfg = BODY_TYPE_CONFIGS[bodyType];
  const skinItem = COSMETIC_BY_ID[equipped.skin] || COSMETIC_BY_ID['skin_classic'];
  const suitItem = COSMETIC_BY_ID[equipped.suit];
  const hatItem = COSMETIC_BY_ID[equipped.hat];
  const glassesItem = COSMETIC_BY_ID[equipped.glasses];

  const activeSuitShape =
    suitItem && suitItem.shape !== 'none'
      ? suitItem.shape
      : skinItem.shape === 'tuxedo'
        ? 'tuxedo'
        : null;
  const isWearingSuit = Boolean(activeSuitShape);

  const isRainbow = skinItem.shape === 'rainbow';
  const baseColor = isRainbow
    ? `hsl(${(time * 110) % 360}, 82%, 62%)`
    : skinItem.shape === 'tuxedo'
      ? '#9CA3AF'
      : skinItem.previewColor;
  const lightColor = isRainbow
    ? `hsl(${(time * 110 + 30) % 360}, 90%, 78%)`
    : adjustHex(baseColor, 34);
  const darkColor = isRainbow
    ? `hsl(${(time * 110 - 20) % 360}, 75%, 44%)`
    : adjustHex(baseColor, -42);
  const earInnerColor =
    skinItem.id === 'skin_classic' || skinItem.shape === 'tuxedo' ? '#FDA4AF' : lightColor;
  const scarfColor =
    skinItem.accentColor || (skinItem.id === 'skin_classic' ? '#EF4444' : '#FACC15');

  ctx.save();
  ctx.translate(elephant.x, elephant.y);

  // Flicker during post-shield invincibility
  if (elephant.invincibleTimer > 0 && Math.floor(time * 18) % 2 === 0) {
    ctx.globalAlpha = 0.52;
  }

  // Shield Aura Bubble
  if (hasShield) {
    ctx.save();
    const shieldPulse = 1 + Math.sin(time * 5) * 0.04;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.88)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      (ELEPHANT_RADIUS + 13) * Math.max(bodyCfg.scaleX, bodyCfg.scaleY) * shieldPulse,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.rotate(elephant.rotation);
  ctx.scale(bodyCfg.scaleX, bodyCfg.scaleY);

  const r = ELEPHANT_RADIUS;

  // Flowing Scarf, Coattails, or Hero Cape behind body
  const wave1 = Math.sin(time * 14 + elephant.scarfWave) * 5;
  const wave2 = Math.cos(time * 14 + elephant.scarfWave) * 7;
  if (activeSuitShape === 'tuxedo' || activeSuitShape === 'pirate') {
    ctx.fillStyle = activeSuitShape === 'pirate' ? '#7F1D1D' : '#0F172A';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 6);
    ctx.quadraticCurveTo(-24, 7 + wave1 * 0.55, -39, 11 + wave2 * 0.65);
    ctx.lineTo(-31, 14 + wave2 * 0.65);
    ctx.lineTo(-37, 19 + wave2 * 0.65);
    ctx.quadraticCurveTo(-20, 14 + wave1 * 0.55, -6, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (
    activeSuitShape === 'superhero' ||
    activeSuitShape === 'vampire' ||
    activeSuitShape === 'king_robe'
  ) {
    ctx.fillStyle =
      activeSuitShape === 'superhero'
        ? '#DC2626'
        : activeSuitShape === 'vampire'
          ? '#7F1D1D'
          : '#581C87';
    ctx.strokeStyle = activeSuitShape === 'king_robe' ? '#FACC15' : '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 2);
    ctx.quadraticCurveTo(-24, 3 + wave1 * 0.65, -42, 9 + wave2 * 0.8);
    ctx.lineTo(-38, 19 + wave2 * 0.75);
    ctx.quadraticCurveTo(-21, 13 + wave1 * 0.55, -6, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (!isWearingSuit) {
    ctx.fillStyle = scarfColor;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 6);
    ctx.quadraticCurveTo(-22, 4 + wave1, -38, 10 + wave2);
    ctx.lineTo(-34, 18 + wave2);
    ctx.quadraticCurveTo(-18, 12 + wave1, -2, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Legs (Matching outfit trousers/armor when wearing a suit)
  const legColors = activeSuitShape
    ? getSuitLegColors(activeSuitShape)
    : { fill: darkColor, stroke: '#0F172A' };
  ctx.fillStyle = legColors.fill;
  ctx.strokeStyle = legColors.stroke;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(-15, 13, 9, 10, 4);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(2, 14, 9, 10, 4);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-r + 2, 2);
  ctx.quadraticCurveTo(-r - 10, -2 + wave1 * 0.3, -r - 12, 6);
  ctx.stroke();

  // Plump Body + Pattern Clip
  ctx.save();
  const bodyGrad = ctx.createRadialGradient(-4, -6, 4, 0, 0, r + 6);
  bodyGrad.addColorStop(0, lightColor);
  bodyGrad.addColorStop(0.65, baseColor);
  bodyGrad.addColorStop(1, darkColor);

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(-2, 1, r + 2, r - 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.clip();

  // Special skin patterns (stripes, spots, galaxy, metallic)
  if (skinItem.shape === 'stripes') {
    ctx.fillStyle = skinItem.accentColor || '#0F172A';
    for (let sx = -20; sx <= 18; sx += 11) {
      ctx.beginPath();
      ctx.ellipse(sx, -8, 2.6, 14, 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skinItem.shape === 'spots') {
    ctx.fillStyle = skinItem.accentColor || '#1E293B';
    const spots = [
      [-12, -8, 4.5],
      [3, -11, 3.5],
      [-6, 8, 5],
      [10, 4, 3.8],
      [-15, 3, 3.2],
    ];
    for (const [sx, sy, sr] of spots) {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skinItem.shape === 'galaxy') {
    ctx.fillStyle = '#FDE047';
    const stars = [
      [-14, -7, 1.5],
      [2, -10, 2],
      [-7, 7, 1.6],
      [9, 6, 1.4],
      [-3, -2, 1.2],
    ];
    for (const [sx, sy, sr] of stars) {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skinItem.shape === 'metallic') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-7, -9, 12, 5, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  if (bodyType === 'chubby' && !isWearingSuit) {
    ctx.fillStyle = lightColor;
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    ctx.ellipse(-1, 9, r * 0.72, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // Body outline
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(-2, 1, r + 2, r - 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  const drawFlappingEar = () => {
    const flapAngle =
      elephant.earFlapTimer > 0
        ? Math.sin(elephant.earFlapTimer * 28) * 0.72 - 0.35
        : Math.sin(elephant.earPhase) * 0.14 + 0.12;

    ctx.save();
    ctx.translate(-3, -4);
    ctx.rotate(flapAngle);

    ctx.fillStyle = baseColor;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(-10, 4, 15, 19, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = earInnerColor;
    ctx.beginPath();
    ctx.ellipse(-10, 5, 9, 12.5, 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  if (isWearingSuit && activeSuitShape) {
    // Draw Flapping Ear BEFORE suit overlay so bottom ear tucks cleanly INSIDE the suit/collar!
    drawFlappingEar();
    drawElephantSuitOverlay(ctx, activeSuitShape, r);

    // Re-stroke body outline cleanly over suit clip seam
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(-2, 1, r + 2, r - 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Classic Scarf Collar
    ctx.fillStyle = scarfColor;
    ctx.beginPath();
    ctx.roundRect(-6, 5, 16, 7, 3.5);
    ctx.fill();
    ctx.stroke();
  }

  // Trunk
  const trunkLift =
    elephant.earFlapTimer > 0 ? -7 : Math.min(8, Math.max(-6, elephant.vy * 0.014));
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 9.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r - 4, 0);
  ctx.bezierCurveTo(r + 12, -1 + trunkLift, r + 19, -8 + trunkLift, r + 15, -14 + trunkLift);
  ctx.stroke();

  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(r - 4, 0);
  ctx.bezierCurveTo(r + 12, -1 + trunkLift, r + 19, -8 + trunkLift, r + 15, -14 + trunkLift);
  ctx.stroke();

  // Ivory Tusk
  ctx.fillStyle = '#FEF3C7';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r - 6, 7);
  ctx.quadraticCurveTo(r + 5, 10, r + 8, 3);
  ctx.quadraticCurveTo(r + 1, 5, r - 5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eye
  const eyeX = 11;
  const eyeY = -7;
  if (elephant.isHurt) {
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(eyeX - 4, eyeY - 4);
    ctx.lineTo(eyeX + 4, eyeY + 4);
    ctx.moveTo(eyeX + 4, eyeY - 4);
    ctx.lineTo(eyeX - 4, eyeY + 4);
    ctx.stroke();
  } else {
    const isBlinking = elephant.blinkTimer > 0 && elephant.blinkTimer < 0.12;
    if (isBlinking) {
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(eyeX - 4, eyeY);
      ctx.lineTo(eyeX + 4, eyeY);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(eyeX + 1.5, eyeY, 2.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(eyeX + 2.3, eyeY - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Glasses Cosmetic
  if (glassesItem && glassesItem.shape !== 'none') {
    drawElephantGlasses(ctx, glassesItem, eyeX, eyeY);
  }

  // Normal ear on top when not wearing an overlay suit
  if (!isWearingSuit) {
    drawFlappingEar();
  }

  // Hats Cosmetic
  if (hatItem && hatItem.shape !== 'none') {
    drawElephantHat(ctx, hatItem, time);
  }

  ctx.restore();
}

function drawElephantGlasses(
  ctx: CanvasRenderingContext2D,
  item: CosmeticItem,
  eyeX: number,
  eyeY: number
) {
  const main = item.previewColor;
  const accent = item.accentColor || '#FFFFFF';

  ctx.save();
  if (item.shape === 'sunglasses') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(eyeX - 7, eyeY - 5, 14, 9, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(eyeX - 7, eyeY - 2);
    ctx.lineTo(eyeX - 15, eyeY - 1);
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(eyeX - 3, eyeY - 3);
    ctx.lineTo(eyeX + 1, eyeY + 1);
    ctx.stroke();
  } else if (item.shape === 'monocle') {
    ctx.strokeStyle = main;
    ctx.lineWidth = 2.2;
    ctx.fillStyle = 'rgba(186, 230, 253, 0.26)';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(eyeX - 4, eyeY + 5);
    ctx.quadraticCurveTo(eyeX - 7, eyeY + 14, eyeX - 3, eyeY + 20);
    ctx.stroke();
  } else if (item.shape === 'visor') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(eyeX - 10, eyeY - 4.5, 20, 7.5, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(eyeX - 6, eyeY - 2, 12, 2);
  } else if (item.shape === 'round') {
    ctx.strokeStyle = main;
    ctx.lineWidth = 2.2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(eyeX - 6.5, eyeY);
    ctx.lineTo(eyeX - 14, eyeY);
    ctx.stroke();
  } else if (item.shape === 'star') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? 8.5 : 4;
      const angle = (Math.PI * i) / 5 - Math.PI / 2;
      const sx = eyeX + Math.cos(angle) * rad;
      const sy = eyeY + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (item.shape === 'heart') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(eyeX, eyeY + 6);
    ctx.bezierCurveTo(eyeX - 9, eyeY, eyeX - 8, eyeY - 7, eyeX, eyeY - 3);
    ctx.bezierCurveTo(eyeX + 8, eyeY - 7, eyeX + 9, eyeY, eyeX, eyeY + 6);
    ctx.fill();
    ctx.stroke();
  } else if (item.shape === 'pixel') {
    ctx.fillStyle = '#020617';
    ctx.fillRect(eyeX - 8, eyeY - 4, 16, 6);
    ctx.fillRect(eyeX - 6, eyeY + 2, 12, 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(eyeX - 4, eyeY - 2, 3, 2);
    ctx.fillRect(eyeX + 2, eyeY - 2, 3, 2);
  } else if (item.shape === '3d') {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(eyeX - 7, eyeY - 5, 14, 9, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(eyeX - 5, eyeY - 3, 5, 5);
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(eyeX + 1, eyeY - 3, 5, 5);
  } else if (item.shape === 'eyepatch') {
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(eyeX - 14, eyeY - 6);
    ctx.lineTo(eyeX + 8, eyeY + 4);
    ctx.stroke();
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawElephantHat(ctx: CanvasRenderingContext2D, item: CosmeticItem, time: number) {
  const main = item.previewColor;
  const accent = item.accentColor || '#FACC15';

  ctx.save();
  ctx.translate(2, -19);

  if (item.shape === 'crown') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-11, 3);
    ctx.lineTo(-13, -10);
    ctx.lineTo(-5, -3);
    ctx.lineTo(0, -13);
    ctx.lineTo(5, -3);
    ctx.lineTo(13, -10);
    ctx.lineTo(11, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -2, 2.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.shape === 'aviator') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-1, 3, 14, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(1, -5, 11, 6, 2.5);
    ctx.fill();
    ctx.stroke();
  } else if (item.shape === 'party') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-9, 2);
    ctx.lineTo(0, -18);
    ctx.lineTo(9, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -19, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (item.shape === 'propeller') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 3, 12, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.arc(0, 3, 11, -Math.PI * 0.45, 0);
    ctx.closePath();
    ctx.fill();

    const spinWidth = Math.max(2, Math.abs(Math.cos(time * 22)) * 15);
    ctx.fillStyle = accent;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-spinWidth, -13, spinWidth * 2, 4, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, -11, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.shape === 'wizard') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    // Brim
    ctx.beginPath();
    ctx.ellipse(0, 2, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Cone bent slightly back
    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.quadraticCurveTo(-4, -14, -12, -22);
    ctx.quadraticCurveTo(2, -14, 10, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Star badge
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -6, 2.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.shape === 'tophat') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-14, 0, 28, 4, 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(-10, -16, 20, 17, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.fillRect(-9, -4, 18, 3.5);
  } else if (item.shape === 'viking') {
    // Horns
    ctx.fillStyle = accent;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.quadraticCurveTo(-20, -8, -16, -18);
    ctx.quadraticCurveTo(-12, -10, -6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.quadraticCurveTo(20, -8, 16, -18);
    ctx.quadraticCurveTo(12, -10, 6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dome
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.arc(0, 3, 12, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (item.shape === 'chef') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(-6, -10, 8, 0, Math.PI * 2);
    ctx.arc(6, -10, 8, 0, Math.PI * 2);
    ctx.arc(0, -14, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-10, -6, 20, 9);
    ctx.strokeRect(-10, -6, 20, 9);
  } else if (item.shape === 'halo') {
    const hover = Math.sin(time * 5) * 2;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, -9 + hover, 13, 4.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = main;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, -9 + hover, 13, 4.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (item.shape === 'devil') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 2);
    ctx.quadraticCurveTo(-13, -10, -7, -15);
    ctx.quadraticCurveTo(-4, -8, -2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.quadraticCurveTo(10, -10, 14, -14);
    ctx.quadraticCurveTo(12, -5, 10, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (item.shape === 'beanie') {
    ctx.fillStyle = main;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 3, 12, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Brim cuff
    ctx.fillStyle = adjustHex(main, -25);
    ctx.beginPath();
    ctx.roundRect(-13, -1, 26, 5, 2.5);
    ctx.fill();
    ctx.stroke();
    // Pom
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -11, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (item.shape === 'astronaut') {
    ctx.restore(); // Reset top-of-head translation so helmet wraps head
    ctx.save();
    ctx.strokeStyle = main;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(2, -1, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Glass shine
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(2, -1, 22, -Math.PI * 0.75, -Math.PI * 0.45);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawElephantPortrait(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bodyType: BodyType,
  equipped: EquippedCosmetics,
  options?: {
    background?: 'none' | 'savanna' | 'dark';
    showShield?: boolean;
    time?: number;
    scale?: number;
  }
) {
  const bg = options?.background ?? 'none';
  const time = options?.time ?? 1.2;
  const userScale = options?.scale ?? 1;

  ctx.clearRect(0, 0, width, height);

  if (bg === 'savanna') {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0284C7');
    sky.addColorStop(0.65, '#7DD3FC');
    sky.addColorStop(1, '#FEF3C7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
    ctx.beginPath();
    ctx.arc(width * 0.78, height * 0.24, width * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(width * 0.78, height * 0.24, width * 0.095, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 1.03, width * 0.75, height * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (bg === 'dark') {
    const grad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.42,
      width * 0.08,
      width * 0.5,
      height * 0.5,
      width * 0.6
    );
    grad.addColorStop(0, '#1E293B');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  const unitScale = (Math.min(width, height) / 96) * userScale;
  const dummyElephant: ElephantState = {
    x: 0,
    y: 0,
    vy: -60,
    rotation: -0.05,
    earPhase: 0.5,
    earFlapTimer: 0,
    trunkPhase: 0,
    scarfWave: 0.4,
    blinkTimer: 2,
    isHurt: false,
    invincibleTimer: 0,
  };

  ctx.save();
  ctx.translate(width * 0.47, height * 0.57);
  ctx.scale(unitScale, unitScale);
  drawElephant(ctx, dummyElephant, bodyType, equipped, Boolean(options?.showShield), time);
  ctx.restore();
}

export function drawCosmeticItemIcon(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  item: CosmeticItem,
  time = 1.2
) {
  ctx.clearRect(0, 0, width, height);
  const minDim = Math.min(width, height);

  if (item.category === 'skin' || item.category === 'suit') {
    drawElephantPortrait(
      ctx,
      width,
      height,
      'normal',
      {
        hat: 'hat_none',
        glasses: 'glasses_none',
        skin: item.category === 'skin' ? item.id : 'skin_classic',
        trail: 'trail_none',
        suit: item.category === 'suit' ? item.id : 'suit_none',
      },
      { background: 'none', time, scale: 1.06 }
    );
    return;
  }

  if (item.category === 'hat') {
    if (item.shape === 'none') {
      ctx.save();
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = Math.max(1.8, minDim * 0.05);
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.52, minDim * 0.28, Math.PI, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(width * 0.25, height * 0.72);
      ctx.lineTo(width * 0.75, height * 0.28);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    if (item.shape === 'astronaut') {
      const s = minDim / 64;
      ctx.translate(width * 0.5 - 2 * s, height * 0.52 + 1 * s);
      ctx.scale(s, s);
      drawElephantHat(ctx, item, time);
    } else {
      const s = minDim / 44;
      ctx.translate(width * 0.5 - 2 * s, height * 0.72 + 12 * s);
      ctx.scale(s, s);
      drawElephantHat(ctx, item, time);
    }
    ctx.restore();
    return;
  }

  if (item.category === 'glasses') {
    if (item.shape === 'none') {
      ctx.save();
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = Math.max(1.8, minDim * 0.05);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.5, minDim * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(width * 0.26, height * 0.74);
      ctx.lineTo(width * 0.74, height * 0.26);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const s = minDim / 28;
    ctx.save();
    ctx.translate(width * 0.56, height * 0.5);
    ctx.scale(s, s);
    drawElephantGlasses(ctx, item, 0, 0);
    ctx.restore();
    return;
  }

  // Trail preview: diagonal burst of styled trail particles
  const rainbowPalette = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#38BDF8', '#A855F7'];
  const points = [
    { x: 0.22, y: 0.76, r: 0.085, a: 0.45 },
    { x: 0.37, y: 0.62, r: 0.105, a: 0.62 },
    { x: 0.54, y: 0.46, r: 0.125, a: 0.8 },
    { x: 0.74, y: 0.28, r: 0.15, a: 0.98 },
  ];

  points.forEach((pt, idx) => {
    let color = item.previewColor;
    let mode: 'puff' | 'ring' | 'spark' = 'puff';

    if (item.shape === 'rainbow' || item.shape === 'confetti') {
      color = rainbowPalette[(idx + 1) % rainbowPalette.length];
      mode = 'spark';
    } else if (item.shape === 'aurora') {
      color = idx % 2 === 0 ? '#2DD4BF' : '#A855F7';
      mode = 'puff';
    } else if (item.shape === 'royal') {
      color = idx % 2 === 0 ? '#9333EA' : '#FACC15';
      mode = 'spark';
    } else if (item.shape === 'ring') {
      mode = 'ring';
    } else if (item.shape === 'spark') {
      mode = 'spark';
    }

    const px = width * pt.x;
    const py = height * pt.y;
    const pr = minDim * pt.r;

    ctx.save();
    ctx.globalAlpha = pt.a;
    if (mode === 'ring') {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.8, minDim * 0.045);
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.stroke();
    } else if (mode === 'spark') {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rad = i % 2 === 0 ? pr * 1.25 : pr * 0.5;
        const ang = (Math.PI * i) / 4;
        const sx = px + Math.cos(ang) * rad;
        const sy = py + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

export function exportElephantAvatarDataUrl(
  bodyType: BodyType,
  equipped: EquippedCosmetics,
  background: 'none' | 'savanna' = 'none',
  size = 512
): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawElephantPortrait(ctx, size, size, bodyType, equipped, {
    background,
    time: 1.2,
    scale: 1.08,
  });
  return canvas.toDataURL('image/png');
}

