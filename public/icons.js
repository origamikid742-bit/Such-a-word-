'use strict';

// Player icons: a colored circle holding your letter tile (the default), a
// line drawing or an emoji. The same 24 emojis are the chat buttons. Shared
// by the browser and the server, which checks that an icon is one of these.

const ICON_COLORS = [
  { name: 'Butter', hex: '#F5E28C' },
  { name: 'Apricot', hex: '#F3CFA1' },
  { name: 'Rose', hex: '#F5C4C4' },
  { name: 'Pink', hex: '#F2C9E0' },
  { name: 'Lavender', hex: '#DDD0F0' },
  { name: 'Sky', hex: '#C8DDF2' },
  { name: 'Aqua', hex: '#BFE6E8' },
  { name: 'Mint', hex: '#C4E5D1' },
  { name: 'Lime', hex: '#DDEBB8' },
  { name: 'Sand', hex: '#E8DCCB' },
];

// 24 × 24 line drawings with rounded strokes in the text color.
const ICON_DRAWINGS = (() => {
  const dot = (x, y, r = 1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`;
  return {
    owl: { name: 'Owl', svg: `<path d="M5.5 4.5 L8.5 7.2 Q12 6.2 15.5 7.2 L18.5 4.5 V14 Q18.5 20.5 12 20.5 Q5.5 20.5 5.5 14 Z"/><circle cx="9.4" cy="11" r="1.9"/><circle cx="14.6" cy="11" r="1.9"/>${dot(9.4, 11, 0.85)}${dot(14.6, 11, 0.85)}<path d="M11.3 13.4 L12 14.6 L12.7 13.4"/><path d="M8.6 17.6 Q12 19.2 15.4 17.6"/>` },
    fox: { name: 'Fox', svg: `<path d="M3.5 4 L9 8.5 H15 L20.5 4 L19.5 11.5 Q18 16.5 12 20.5 Q6 16.5 4.5 11.5 Z"/><path d="M4.5 11.5 Q8.5 12 10.6 14.8"/><path d="M19.5 11.5 Q15.5 12 13.4 14.8"/>${dot(9, 10.8)}${dot(15, 10.8)}${dot(12, 17.2, 1.15)}` },
    cat: { name: 'Cat', svg: `<path d="M5 10 V4.5 L9.2 7.5 Q12 6.8 14.8 7.5 L19 4.5 V10 Q20 12 19.4 14.8 Q18 20 12 20 Q6 20 4.6 14.8 Q4 12 5 10 Z"/>${dot(9.3, 12.3)}${dot(14.7, 12.3)}<path d="M11 14.8 H13 L12 15.9 Z" fill="currentColor"/><path d="M2.5 14.5 L7 15 M2.5 17 L7 16.2 M21.5 14.5 L17 15 M21.5 17 L17 16.2"/>` },
    rocket: { name: 'Rocket', svg: '<path d="M12 2.5 Q16.5 6 16.5 12 V16.5 H7.5 V12 Q7.5 6 12 2.5 Z"/><circle cx="12" cy="9.5" r="1.9"/><path d="M7.5 12.5 L4.5 15.5 V18.5 L7.5 16.5 M16.5 12.5 L19.5 15.5 V18.5 L16.5 16.5"/><path d="M10 16.5 Q10 19.5 12 21.5 Q14 19.5 14 16.5"/>' },
    cactus: { name: 'Cactus', svg: '<path d="M10 20.5 V6.2 Q10 4 12 4 Q14 4 14 6.2 V20.5"/><path d="M10 14 H8.2 Q6 14 6 11.8 V9 Q6 7.8 7.1 7.8 Q8.2 7.8 8.2 9 V11.2 Q8.2 11.8 8.8 11.8 H10"/><path d="M14 16 H15.8 Q18 16 18 13.8 V11.5 Q18 10.3 16.9 10.3 Q15.8 10.3 15.8 11.5 V13.2 Q15.8 13.8 15.2 13.8 H14"/><path d="M5 20.5 H19"/>' },
    mug: { name: 'Mug', svg: '<path d="M5 9 H16 V16.5 Q16 20 12.5 20 H8.5 Q5 20 5 16.5 Z"/><path d="M16 11 H17.8 Q20 11 20 13.3 Q20 15.5 17.8 15.5 H16"/><path d="M9 6.5 C8 5.5 10 4.5 9 3 M12.5 6.5 C11.5 5.5 13.5 4.5 12.5 3"/>' },
    pencil: { name: 'Pencil', svg: '<path d="M15 4.5 L19.5 9 L9 19.5 L3.5 20.5 L4.5 15 Z"/><path d="M13 6.5 L17.5 11"/><path d="M4.5 15 L9 19.5"/>' },
    book: { name: 'Book', svg: '<path d="M12 6.5 Q8.5 4.5 3.5 5 V18 Q8.5 17.5 12 19.5 Q15.5 17.5 20.5 18 V5 Q15.5 4.5 12 6.5 Z"/><path d="M12 6.5 V19.5"/><path d="M6 8.6 Q8 8.4 9.8 9.2 M6 11.6 Q8 11.4 9.8 12.2 M14.2 9.2 Q16 8.4 18 8.6 M14.2 12.2 Q16 11.4 18 11.6"/>' },
    crown: { name: 'Crown', svg: `<path d="M3.5 8.5 L7.5 12.5 L12 5.5 L16.5 12.5 L20.5 8.5 L19 17 H5 Z"/><path d="M5 20 H19"/>${dot(3.5, 7, 1.1)}${dot(12, 3.9, 1.1)}${dot(20.5, 7, 1.1)}` },
    dice: { name: 'Dice', svg: `<rect x="4" y="4" width="16" height="16" rx="3.5"/>${dot(8.5, 8.5, 1.3)}${dot(15.5, 8.5, 1.3)}${dot(12, 12, 1.3)}${dot(8.5, 15.5, 1.3)}${dot(15.5, 15.5, 1.3)}` },
    bulb: { name: 'Light bulb', svg: '<path d="M9 17 V15.5 Q9 14.3 8 13.3 A6 6 0 1 1 16 13.3 Q15 14.3 15 15.5 V17 Z"/><path d="M9.5 19.5 H14.5 M10.5 21.5 H13.5"/><path d="M10 12 L11 13 L12 12 L13 13 L14 12"/>' },
    plane: { name: 'Paper plane', svg: '<path d="M2.5 11.5 L21.5 3 L16 20.5 L11 13.5 Z"/><path d="M11 13.5 L21.5 3"/><path d="M11 13.5 V19 L13.8 16.3"/>' },
    whale: { name: 'Whale', svg: `<path d="M2.5 13.5 Q2.5 8.5 9 8.5 Q14.5 8.5 16.5 12.5 L19 9.8 Q20.8 9 20.8 10.8 L19.6 13.8 L20.8 16.8 Q20.8 18.6 19 17.8 L16.5 15.2 Q14 19.5 9 19.5 Q2.5 19.5 2.5 13.5 Z"/>${dot(6.8, 12.3)}<path d="M3.2 15 Q6.5 16.3 10.5 15"/><path d="M8.5 6.5 V4.8 M8.5 4.8 Q7.5 3 6 3.2 M8.5 4.8 Q9.5 3 11 3.2"/>` },
    mushroom: { name: 'Mushroom', svg: '<path d="M3.5 12.5 Q3.5 4 12 4 Q20.5 4 20.5 12.5 Z"/><path d="M9 12.5 V18 Q9 20.5 12 20.5 Q15 20.5 15 18 V12.5"/><circle cx="8" cy="9" r="1.3"/><circle cx="12.5" cy="7" r="1.1"/><circle cx="16.3" cy="9.5" r="1.2"/>' },
    sun: { name: 'Sun', svg: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.3 5.3 L7 7 M17 17 L18.7 18.7 M5.3 18.7 L7 17 M17 7 L18.7 5.3"/>' },
    moon: { name: 'Moon', svg: '<path d="M20 14.5 A8.5 8.5 0 1 1 9.5 4 A8 8 0 0 0 20 14.5 Z"/><path d="M17 3.5 V6.5 M15.5 5 H18.5"/>' },
    shoe: { name: 'Shoe', svg: '<path d="M3.5 15 V11 Q3.5 9.5 5 9.5 H7.4 Q8.3 9.5 8.8 10.3 L10.2 12.2 Q12.6 13.3 15.6 13.4 L18.6 13.8 Q20.5 14.1 20.5 15 Z"/><path d="M3 15 H21 V16.8 Q21 17.8 20 17.8 H4 Q3 17.8 3 16.8 Z"/><path d="M10 12 L11 10.9 M12.2 13 L13.2 11.9"/>' },
    bike: { name: 'Bike', svg: '<circle cx="6" cy="15.5" r="3.8"/><circle cx="18" cy="15.5" r="3.8"/><path d="M6 15.5 L9.5 9 L11 15.5 Z M9.5 9 L15.5 9.5 L11 15.5 M15.5 9.5 L18 15.5 M15.5 9.5 L15.8 7 H17.5 M8 8.5 H11"/>' },
    swimmer: { name: 'Swimmer', svg: `<circle cx="18" cy="9" r="1.9"/><path d="M4.5 13.5 Q10 11.2 15.8 11.8"/><path d="M8 12.6 Q10.5 6 15.5 7.8"/><path d="M3 16.5 Q5 15 7 16.5 Q9 18 11 16.5 Q13 15 15 16.5 Q17 18 19 16.5 Q20 15.8 21 16"/><path d="M3 20 Q5 18.5 7 20 Q9 21.5 11 20 Q13 18.5 15 20 Q17 21.5 19 20 Q20 19.3 21 19.5"/>` },
    barbell: { name: 'Barbell', svg: '<path d="M1.8 12 H3.5 M9 12 H15 M20.5 12 H22.2"/><rect x="6" y="6" width="3" height="12" rx="1"/><rect x="3.5" y="8" width="2.5" height="8" rx="1"/><rect x="15" y="6" width="3" height="12" rx="1"/><rect x="18" y="8" width="2.5" height="8" rx="1"/>' },
  };
})();

const CHAT_EMOJIS = [
  '😂', '😅', '😎', '🤔', '🧐', '😏', '🤥', '😬', '😮', '🤯', '😢', '🙄',
  '🥳', '👀', '👍', '👎', '👏', '🙏', '🤞', '🔥', '💯', '🎉', '❤️', '🧠',
];

// An icon is { color, kind, value }: color is 0 to 9; kind is 'letter' (your
// name's first letter on a tile, the default), 'drawing' or 'emoji'.
function isValidIcon(icon) {
  if (!icon || typeof icon !== 'object') return false;
  if (!Number.isInteger(icon.color) || icon.color < 0 || icon.color >= ICON_COLORS.length) return false;
  if (icon.kind === 'letter') return true;
  if (icon.kind === 'drawing') return Object.hasOwn(ICON_DRAWINGS, icon.value);
  if (icon.kind === 'emoji') return CHAT_EMOJIS.includes(icon.value);
  return false;
}

if (typeof module !== 'undefined') module.exports = { ICON_COLORS, ICON_DRAWINGS, CHAT_EMOJIS, isValidIcon };
