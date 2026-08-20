// ROYEXA CRM — Connected Gmail workspace bridge
(function () {
  'use strict';
  function openGmailWorkspace() {
    let connection = null;
    try { connection = JSON.parse(localStorage.getItem('royexa_gmail_connection') || 'null'); } catch (_) {}
    const email = connection?.email || connection?.gmail || '';
    window.dispatchEvent(new CustomEvent('royexa:gmail-open', { detail: { email } }));
    setTimeout(function () {
      if (!document.querySelector('[data-royexa-gmail-workspace="open"]')) {
        window.open('https://mail.google.com/mail/u/0/#inbox', '_blank', 'noopener,noreferrer');
      }
    }, 350);
  }
  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-action="gmail-workspace"], [data-gmail-action="open"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openGmailWorkspace();
  }, true);
  window.ROYEXA_GMAIL = Object.assign(window.ROYEXA_GMAIL || {}, { openWorkspace: openGmailWorkspace });
})();
