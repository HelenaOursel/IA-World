// Contenu des écrans des postes, dessiné sur canvas : code, terminal, documents, radar, réseau, tableau.
import { roundRect, scanlines } from '../geometry.js';
import { drawDoodles } from '../doodles.js';
import { STATION_COLORS } from './layout.js';

export const NEON_TOKENS = ['#4cc9f0', '#b388ff', '#3ddc97', '#ffc53d', '#f15bb5', '#7b9cff', '#e6edf7'];

export function randomCodeRow() {
  const indent = Math.floor(Math.random() * 4);
  const tokens = [];
  const n = 1 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) tokens.push({ w: 18 + Math.random() * 70, c: NEON_TOKENS[Math.floor(Math.random() * NEON_TOKENS.length)] });
  return { indent, tokens };
}

export function fitText(ctx, text, max) {
  let t = text;
  while (ctx.measureText(t).width > max && t.length > 4) t = t.slice(0, -2);
  return t === text ? t : t + '…';
}

export function screenFrame(ctx, w, h, color, title) {
  ctx.fillStyle = '#060a14';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0c1424';
  ctx.fillRect(0, 0, w, 44);
  ctx.fillStyle = color;
  ctx.fillRect(0, 42, w, 2);
  ctx.font = '600 20px Consolas, "Cascadia Code", monospace';
  ctx.fillText(fitText(ctx, title, w - 40), 18, 30);
}

export function drawCode(ctx, w, h, code) {
  screenFrame(ctx, w, h, STATION_COLORS.write, '▸ ' + code.file);
  code.rows.slice(-10).forEach((row, i) => {
    const y = 62 + i * 32;
    ctx.fillStyle = '#34415e';
    ctx.font = '16px Consolas, monospace';
    ctx.fillText(String(code.scroll + i + 1).padStart(3, ' '), 10, y + 13);
    let x = 58 + row.indent * 26;
    for (const t of row.tokens) {
      ctx.fillStyle = t.c;
      roundRect(ctx, x, y, t.w, 14, 7);
      ctx.fill();
      x += t.w + 11;
    }
  });
  scanlines(ctx, w, h);
}

export function drawTerminal(ctx, w, h, lines) {
  ctx.fillStyle = '#030807';
  ctx.fillRect(0, 0, w, h);
  ctx.font = '21px Consolas, "Cascadia Code", monospace';
  const visible = lines.slice(-12);
  visible.forEach((l, i) => {
    ctx.fillStyle = l.c || '#a7f3d0';
    ctx.fillText(fitText(ctx, l.t, w - 30), 14, 32 + i * 30);
  });
  if (Math.floor(performance.now() / 500) % 2) {
    ctx.fillStyle = '#39ff9f';
    ctx.fillRect(14, 32 + visible.length * 30 - 19, 11, 22);
  }
  scanlines(ctx, w, h, 0.22);
}

export function drawDocs(ctx, w, h, doc) {
  screenFrame(ctx, w, h, STATION_COLORS.read, '▤ ' + doc.file);
  doc.rows.forEach((row, i) => {
    const y = 64 + i * 26;
    if (y > h - 10) return;
    const current = i === doc.cursor;
    ctx.fillStyle = current ? 'rgba(76,201,240,0.18)' : 'transparent';
    ctx.fillRect(10, y - 6, w - 20, 22);
    ctx.fillStyle = current ? '#9be7ff' : row.title ? '#e6edf7' : '#5b6b88';
    roundRect(ctx, 20, y, row.w, row.title ? 12 : 9, 4);
    ctx.fill();
  });
  scanlines(ctx, w, h);
}

export function drawRadar(ctx, w, h, s) {
  screenFrame(ctx, w, h, STATION_COLORS.search, '◎ ' + (s.query || 'recherche'));
  const cx = w / 2, cy = 44 + (h - 44) / 2, r = (h - 70) / 2;
  ctx.strokeStyle = 'rgba(61,220,151,0.35)';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (r * i) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
  const grad = ctx.createConicGradient ? ctx.createConicGradient(s.angle - 0.9, cx, cy) : null;
  if (grad) {
    grad.addColorStop(0, 'rgba(61,220,151,0)');
    grad.addColorStop(0.14, 'rgba(61,220,151,0.55)');
    grad.addColorStop(0.15, 'rgba(61,220,151,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#3ddc97';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(s.angle) * r, cy + Math.sin(s.angle) * r);
  ctx.stroke();
  for (const b of s.blips) {
    ctx.fillStyle = `rgba(160,255,210,${b.life})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(b.a) * b.d * r, cy + Math.sin(b.a) * b.d * r, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  scanlines(ctx, w, h);
}

export function drawNetwork(ctx, w, h, n) {
  screenFrame(ctx, w, h, STATION_COLORS.web, '⌁ ' + (n.host || 'réseau'));
  ctx.lineWidth = 2;
  for (const [a, b] of n.links) {
    ctx.strokeStyle = 'rgba(241,91,181,0.3)';
    ctx.beginPath();
    ctx.moveTo(n.nodes[a].x * w, n.nodes[a].y * h);
    ctx.lineTo(n.nodes[b].x * w, n.nodes[b].y * h);
    ctx.stroke();
  }
  n.links.forEach(([a, b], i) => {
    const k = (n.t * 0.6 + i * 0.37) % 1;
    ctx.fillStyle = '#ffd1ec';
    ctx.beginPath();
    ctx.arc((n.nodes[a].x + (n.nodes[b].x - n.nodes[a].x) * k) * w, (n.nodes[a].y + (n.nodes[b].y - n.nodes[a].y) * k) * h, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  n.nodes.forEach((p, i) => {
    ctx.fillStyle = i === 0 ? '#ff9ad5' : '#f15bb5';
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, i === 0 ? 11 : 7, 0, Math.PI * 2);
    ctx.fill();
  });
  scanlines(ctx, w, h);
}

export function drawBoard(ctx, w, h, todos, doodles) {
  screenFrame(ctx, w, h, STATION_COLORS.plan, '☰ PLAN DE TRAVAIL');
  if (!todos.length) {
    ctx.fillStyle = '#5b6b88';
    ctx.font = 'italic 24px system-ui, sans-serif';
    ctx.fillText('Aucune tâche pour l’instant…', 24, 100);
    drawDoodles(ctx, doodles);
    scanlines(ctx, w, h);
    return;
  }
  const shown = todos.slice(0, 7);
  shown.forEach((t, i) => {
    const y = 60 + i * 46;
    const done = t.status === 'completed', doing = t.status === 'in_progress';
    ctx.fillStyle = doing ? 'rgba(255,197,61,0.16)' : 'rgba(255,255,255,0.04)';
    roundRect(ctx, 16, y, w - 32, 38, 8);
    ctx.fill();
    ctx.fillStyle = done ? '#3ddc97' : doing ? '#ffc53d' : '#5b6b88';
    ctx.font = '700 22px Consolas, monospace';
    ctx.fillText(done ? '✓' : doing ? '▶' : '○', 30, y + 27);
    ctx.fillStyle = done ? '#56708a' : doing ? '#ffe7a8' : '#c4d0e4';
    ctx.font = `${doing ? '600 ' : ''}22px system-ui, sans-serif`;
    ctx.fillText(fitText(ctx, t.content, w - 100), 62, y + 27);
  });
  if (todos.length > shown.length) {
    ctx.fillStyle = '#5b6b88';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(`+ ${todos.length - shown.length} autres`, w - 130, h - 12);
  }
  drawDoodles(ctx, doodles);
  scanlines(ctx, w, h);
}

export function docRows() {
  const rows = [];
  for (let i = 0; i < 12; i++) rows.push({ w: i % 5 === 0 ? 120 + Math.random() * 120 : 200 + Math.random() * 260, title: i % 5 === 0 });
  return rows;
}

export function networkGraph() {
  const nodes = [{ x: 0.5, y: 0.58 }];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    nodes.push({ x: 0.5 + Math.cos(a) * (0.3 + Math.random() * 0.1), y: 0.58 + Math.sin(a) * (0.27 + Math.random() * 0.05) });
  }
  const links = nodes.slice(1).map((_, i) => [0, i + 1]);
  links.push([1, 2], [3, 4], [5, 6], [6, 7]);
  return { nodes, links, t: 0, host: '' };
}
