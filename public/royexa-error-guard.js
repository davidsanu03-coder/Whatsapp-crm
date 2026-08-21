(() => {
  const friendly = (text) => {
    const t = String(text || '');
    if (/Edge Function returned a non-2xx status code|FunctionsHttpError|FunctionsRelayError/i.test(t)) {
      return 'ROYEXA could not complete that task right now. Please make sure the required Google connection is active and try again.';
    }
    if (/Gmail task failed|Gmail API error/i.test(t)) {
      return 'I could not access Gmail right now. Please reconnect Gmail and try again.';
    }
    if (/Calendar task failed|Calendar API error/i.test(t)) {
      return 'I could not access Google Calendar right now. Please reconnect Google and try again.';
    }
    if (/Authentication required|Invalid or expired CRM session/i.test(t)) {
      return 'Your ROYEXA session has expired. Please sign in again.';
    }
    return null;
  };

  const clean = (root) => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const replacement = friendly(node.nodeValue);
      if (replacement && node.nodeValue !== replacement) node.nodeValue = replacement;
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        clean(mutation.target.nodeType === 3 ? mutation.target.parentNode : mutation.target);
      }
    }
  });

  const start = () => {
    clean(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
