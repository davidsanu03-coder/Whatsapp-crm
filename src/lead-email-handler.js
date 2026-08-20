const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function findLeadEmail(target) {
  const explicit = target.closest('[data-email]')?.getAttribute('data-email');
  if (explicit && EMAIL_RE.test(explicit)) return explicit.match(EMAIL_RE)[0];

  let node = target.closest('[data-lead], .leadCard, .lead-card, .leadRow, .lead-row, .leadItem, .lead-item, .leadDetails, .lead-details, article, tr, li');
  for (let i = 0; i < 6 && node; i += 1, node = node.parentElement) {
    const text = node.textContent || '';
    const match = text.match(EMAIL_RE);
    if (match) return match[0];
  }

  const selected = document.querySelector('[data-selected-lead]');
  const selectedEmail = selected?.getAttribute('data-email');
  if (selectedEmail && EMAIL_RE.test(selectedEmail)) return selectedEmail.match(EMAIL_RE)[0];

  const bodyMatch = (document.body.textContent || '').match(EMAIL_RE);
  return bodyMatch ? bodyMatch[0] : '';
}

function openEmailComposer(email, target) {
  const leadName = target.closest('[data-lead-name]')?.getAttribute('data-lead-name') || '';
  const subject = leadName ? `Following up with ${leadName}` : 'Following up';
  const body = leadName ? `Hi ${leadName},\n\n` : 'Hi,\n\n';
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const button = target.closest('button, a');
  if (!button) return;

  const label = (button.getAttribute('aria-label') || button.textContent || '').trim().toLowerCase();
  const isEmailAction = label === 'email' || label.includes('email lead') || label.includes('email contact') || button.dataset.action === 'email-lead';
  if (!isEmailAction) return;

  event.preventDefault();
  event.stopPropagation();

  const email = findLeadEmail(button);
  if (!email) {
    window.alert('No email address is saved for this lead. Add an email address to the lead first.');
    return;
  }

  openEmailComposer(email, button);
}, true);
