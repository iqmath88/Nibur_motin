/* Nibor Motion — in-page confirmation (replaces the browser's confirm()).
 * NM.ask(message, {ok, cancel, danger}) → Promise<boolean>.
 * The browser dialog blocks the page, looks foreign on iPad, and some embedded views suppress it.
 * This one is a modal card inside the page: Enter or the main button confirms, Esc / the backdrop / «إلغاء» cancel.
 */
'use strict';
window.NM = window.NM || {};
(function (NM) {
  let open = null; // one question at a time; a second call cancels the first
  NM.ask = function ask(message, opts = {}) {
    if (open) open(false);
    return new Promise(resolve => {
      const prevFocus = document.activeElement;
      const wrap = document.createElement('div'); wrap.className = 'nm-ask';
      const card = document.createElement('div'); card.className = 'nm-ask-card';
      card.setAttribute('role', 'alertdialog'); card.setAttribute('aria-modal', 'true');
      const msg = document.createElement('p'); msg.className = 'nm-ask-msg'; msg.id = 'nmAskMsg'; msg.textContent = String(message);
      card.setAttribute('aria-describedby', 'nmAskMsg');
      const row = document.createElement('div'); row.className = 'nm-ask-actions';
      const yes = document.createElement('button'); yes.type = 'button'; yes.textContent = opts.ok || 'متابعة';
      if (opts.danger) yes.className = 'nm-ask-danger';
      const no = document.createElement('button'); no.type = 'button'; no.className = 'secondary'; no.textContent = opts.cancel || 'إلغاء';
      row.append(yes, no); card.append(msg, row); wrap.append(card); document.body.append(wrap);
      const done = v => {
        if (open !== done) return; open = null;
        document.removeEventListener('keydown', key, true); wrap.remove();
        try { prevFocus && prevFocus.focus && prevFocus.focus({ preventScroll: true }); } catch (e) { /* element gone */ }
        resolve(v);
      };
      const key = e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
        else if (e.key === 'Enter' && document.activeElement !== no) { e.preventDefault(); e.stopPropagation(); done(true); }
        else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === yes ? no : yes).focus(); }
      };
      open = done;
      yes.onclick = () => done(true); no.onclick = () => done(false);
      wrap.addEventListener('pointerdown', e => { if (e.target === wrap) done(false); });
      document.addEventListener('keydown', key, true);
      // A delete is focused on «إلغاء» so a stray Enter does not delete.
      (opts.danger ? no : yes).focus({ preventScroll: true });
    });
  };
})(window.NM);
