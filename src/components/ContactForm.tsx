import { useState, type FormEvent } from 'react';
import { reveal } from '@/lib/reveal';

// Messages go through Web3Forms (https://web3forms.com): a hosted endpoint
// that forwards the form to the owner's e-mail, so the site stays static.
// The access key is a public identifier (it only says where to deliver), and
// is read from the environment: VITE_WEB3FORMS_KEY, set locally in .env and
// in the Vercel project's environment variables.
const ENDPOINT = 'https://api.web3forms.com/submit';
const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;

type Status = 'idle' | 'sending' | 'sent' | 'error';
type Field = 'name' | 'email' | 'message';
type Errors = Partial<Record<Field, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(data: Record<Field, string>): Errors {
  const errors: Errors = {};
  if (!data.name.trim()) errors.name = 'Tell me your name.';
  if (!EMAIL.test(data.email.trim())) errors.email = 'Enter an e-mail address I can reply to.';
  if (data.message.trim().length < 10) errors.message = 'Write a few words more.';
  return errors;
}

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const [problem, setProblem] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;

    const form = e.currentTarget;
    const values = new FormData(form);
    const data = {
      name: String(values.get('name') ?? ''),
      email: String(values.get('email') ?? ''),
      message: String(values.get('message') ?? ''),
    };
    const found = validate(data);
    setErrors(found);
    if (Object.keys(found).length) {
      // Focus the first field that needs attention.
      form.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus();
      return;
    }

    // A hidden field real visitors never fill in; bots do.
    if (values.get('botcheck')) return;

    if (!ACCESS_KEY) {
      setProblem('The form is not connected yet. Please write to me by e-mail for now.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setProblem('');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: ACCESS_KEY, subject: `Message from ${data.name} via the website`, ...data }),
      });
      const body = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !body.success) throw new Error(body.message || 'Request failed');
      form.reset();
      setStatus('sent');
    } catch {
      setProblem('Your message did not go through. Check your connection and try again.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="contact-sent" role="status">
        <span className="contact-sent-mark" aria-hidden="true">{'✓'}</span>
        <h3 className="contact-sent-title">Message sent</h3>
        <p className="contact-sent-text">Thank you. I will get back to you soon.</p>
        <button type="button" className="contact-link mono" onClick={() => setStatus('idle')}>
          Send another message
        </button>
      </div>
    );
  }

  const field = (name: Field, label: string, delay: number, input: 'input' | 'textarea', extra: Record<string, string> = {}) => {
    const id = `contact-${name}`;
    const error = errors[name];
    const props = {
      id,
      name,
      required: true,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `${id}-error` : undefined,
      onChange: () => error && setErrors((prev) => ({ ...prev, [name]: undefined })),
      ...extra,
    };
    return (
      <div className={`contact-field${error ? ' has-error' : ''}`} {...reveal(delay)}>
        <label htmlFor={id} className="mono">{label}</label>
        {input === 'textarea' ? <textarea rows={5} {...props} /> : <input {...props} />}
        {error && <p className="contact-error" id={`${id}-error`}>{error}</p>}
      </div>
    );
  };

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      {field('name', 'Name', 200, 'input', { type: 'text', autoComplete: 'name' })}
      {field('email', 'E-mail', 270, 'input', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
      {field('message', 'Message', 340, 'textarea')}

      {/* Honeypot: hidden from people and from assistive tech. */}
      <input type="text" name="botcheck" className="contact-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <div className="contact-actions" {...reveal(420)}>
        <button type="submit" className="contact-submit mono" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send message'}
          <span aria-hidden="true">{'→'}</span>
        </button>
        <p className="contact-status" role="status" aria-live="polite">{status === 'error' ? problem : ''}</p>
      </div>
      <p className="contact-note" {...reveal(460)}>
        By sending this message you agree to it being processed as described in the{' '}
        <a href="/privacy/" className="contact-link">privacy policy</a>.
      </p>
    </form>
  );
}
