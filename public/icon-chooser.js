'use strict';

// Choosing your icon: a color, then your letter tile, a drawing or an emoji.
// Opened by tapping your icon on the home screen or in the lobby. Uses byId,
// makeElement and makeIcon from client.js, and the lists in icons.js.

let chooser = null; // { icon, name, onSave } while the chooser is open

function openIconChooser({ icon, name, onSave }) {
  chooser = { icon: { ...icon }, name, onSave };
  renderIconChooser();
  byId('icon-dialog').showModal();
}

function chooseIcon(changes) {
  const { color } = chooser.icon;
  chooser.icon = { color, ...changes };
  renderIconChooser();
}

// One choice: a button showing what you'd get. `key` finds it again after a
// redraw, so keyboard focus stays put.
function makeChoice(key, label, content, chosen, onChoose) {
  const button = makeElement('button', 'choice');
  button.type = 'button';
  button.dataset.choice = key;
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-pressed', String(chosen));
  button.classList.toggle('is-chosen', chosen);
  button.append(content);
  button.addEventListener('click', onChoose);
  return button;
}

function renderIconChooser() {
  const { icon, name } = chooser;
  const focused = document.activeElement?.dataset?.choice;
  const sample = (changes) => makeIcon({ color: icon.color, ...changes }, name, 40);

  byId('icon-preview').replaceChildren(makeIcon(icon, name, 72));
  byId('icon-colors').replaceChildren(...ICON_COLORS.map((color, index) => {
    const swatch = makeElement('span', 'swatch');
    swatch.style.background = color.hex;
    return makeChoice(`color-${index}`, color.name, swatch, icon.color === index, () => {
      chooser.icon = { ...chooser.icon, color: index };
      renderIconChooser();
    });
  }));
  byId('icon-letter').replaceChildren(makeChoice('letter', 'Your letter tile', sample({ kind: 'letter' }),
    icon.kind === 'letter', () => chooseIcon({ kind: 'letter' })));
  byId('icon-drawings').replaceChildren(...Object.entries(ICON_DRAWINGS).map(([key, drawing]) => makeChoice(
    `drawing-${key}`, drawing.name, sample({ kind: 'drawing', value: key }),
    icon.kind === 'drawing' && icon.value === key, () => chooseIcon({ kind: 'drawing', value: key }),
  )));
  byId('icon-emojis').replaceChildren(...CHAT_EMOJIS.map((emoji) => makeChoice(
    `emoji-${emoji}`, emoji, sample({ kind: 'emoji', value: emoji }),
    icon.kind === 'emoji' && icon.value === emoji, () => chooseIcon({ kind: 'emoji', value: emoji }),
  )));
  if (focused) byId('icon-dialog').querySelector(`[data-choice="${CSS.escape(focused)}"]`)?.focus();
}

byId('icon-save').addEventListener('click', () => {
  const { icon, onSave } = chooser;
  byId('icon-dialog').close();
  onSave(icon);
});

byId('icon-cancel').addEventListener('click', () => byId('icon-dialog').close());
