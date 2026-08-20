// ROYEXA CRM — Connected Gmail workspace bridge
// Loaded after the React app. Uses the existing Gmail connection status and
// provides a reliable UI action without injecting a competing navigation system.
(function () {
  'use strict';

  function getGmailConnection() {
    try {
      return JSON.parse(localStorage.getItem('royexa_gmail_connection') || 'null');
    } catch (_) {
      return null;
    }
  }

  function openGmailWorkspace() {
    const connection = getGmailConnection();
    const email = connection?.email || connection?.gmail || '';
    window.dispatchEvent(new CustomEvent('royexa:gmail-open', { detail: { email } }));

    // The React app can handle the event and show its Gmail workspace. If an
    // older build does not have that listener, open Gmail as a safe fallback.
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

  window.ROYEXA_GMAIL = Object.assign(window.ROYEXA_GMAIL || {}, {
    openWorkspace: openGmailWorkspace
  });
})();
