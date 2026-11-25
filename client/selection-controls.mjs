import {escapeHTML as e} from './exports.mjs';

// Exclusive controls keep their original array-shaped answers. A historical
// conflict is presented verbatim, without letting a radio pick an answer for it.
const recorded = value => Array.isArray(value) ? value : [];
const conflict = (control, value) => control.selectionMode === 'single' && recorded(value).length > 1;

export function renderChecks(control, value, label = control.label) {
 const answers = recorded(value), exclusive = control.selectionMode === 'single';
 const review = conflict(control, value), reviewId = 'selection-review-' + control.id.replaceAll('.', '-');
 return `<fieldset${review ? ` aria-describedby="${e(reviewId)}"` : ''}>
  <legend>${e(label)}</legend>
  ${review ? `<div class="selection-review" data-selection-conflict="${e(control.id)}" id="${e(reviewId)}" role="note"><p><strong>Review your recorded answers</strong></p><p>Your earlier selections are preserved below. Choose one answer to replace them.</p><ul>${answers.map(answer => `<li>${e(answer)}</li>`).join('')}</ul></div>` : ''}
  <div class="check-options">${control.options.map(option => `<label class="check-option"><input type="${exclusive ? 'radio' : 'checkbox'}"${exclusive ? ` name="choice-${e(control.id)}"` : ''} data-id="${e(control.id)}" data-option="${e(option)}" ${!review && answers.includes(option) ? 'checked' : ''}><span>${e(option)}</span></label>`).join('')}</div>
  ${exclusive ? `<button type="button" class="text-button" data-action="clear-selection" data-selection-clear="${e(control.id)}" data-id="${e(control.id)}"${review || !answers.length ? ' hidden' : ''}>Clear response</button>` : ''}
 </fieldset>`;
}

export function refreshChecks(control, value, fieldset) {
 if (control.selectionMode !== 'single' || !fieldset) return;
 const answers = recorded(value), review = conflict(control, value);
 for (const input of fieldset.querySelectorAll('input[data-option]')) input.checked = !review && answers.includes(input.dataset.option);
 if (!review) {
  fieldset.querySelector('[data-selection-conflict]')?.remove();
  fieldset.removeAttribute('aria-describedby');
 }
 const clear = fieldset.querySelector('[data-selection-clear]');
 if (clear) clear.hidden = review || !answers.length;
}
