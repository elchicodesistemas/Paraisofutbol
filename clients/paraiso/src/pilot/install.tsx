import React, {useEffect, useState} from 'react';

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
};
let pending: InstallPrompt | null = null;
let installed = false;
const changes = new EventTarget();
// Capture the event before session restoration finishes and React mounts.
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  pending = event as InstallPrompt;
  changes.dispatchEvent(new Event('change'));
});
window.addEventListener('appinstalled', () => {
  installed = true;
  pending = null;
  changes.dispatchEvent(new Event('change'));
});

export function InstallApp() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [, refresh] = useState(0);
  const standalone = window.matchMedia('(display-mode: standalone)');
  useEffect(() => {
    const update = () => refresh(n => n + 1);
    changes.addEventListener('change', update);
    standalone.addEventListener('change', update);
    return () => {
      changes.removeEventListener('change', update);
      standalone.removeEventListener('change', update);
    };
  }, []);
  if (installed || standalone.matches || (navigator as Navigator & {standalone?: boolean}).standalone) return null;
  async function install() {
    setOpen(true);
    if (!pending || busy) return;
    const event = pending;
    pending = null;
    setBusy(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setMessage(choice.outcome === 'accepted'
        ? 'Seguí las indicaciones del navegador para completar la instalación.'
        : 'Podés volver a instalarla desde el menú del navegador cuando quieras.');
    } catch {
      setMessage('No se pudo abrir el instalador. Probá desde el menú del navegador.');
    } finally { setBusy(false); }
  }
  return <section className="install-app" aria-label="Instalación de la app">
    <button type="button" onClick={install} disabled={busy} aria-expanded={open} aria-controls="install-help">{busy ? 'Abriendo instalador…' : 'Instalar app'}</button>
    {open && <div id="install-help" className="install-help">
      <h2>Paraíso en tu celular</h2>
      {message && <p role="status">{message}</p>}
      {location.protocol !== 'https:' && <p>Para instalarla en el celular, abrí el enlace HTTPS de la demo.</p>}
      <p><strong>Android:</strong> abrí este enlace directamente en Chrome. Tocá el menú ⋮ → «Instalar y crear acceso directo» → «Instalar». Según la versión puede decir «Instalar app» o «Agregar a pantalla principal».</p>
      <p>Si llegaste desde WhatsApp, Instagram u otra aplicación, copiá el enlace y pegalo en Chrome. Usá una pestaña normal, fuera del modo incógnito. Si ya la instalaste, buscá Paraíso entre tus aplicaciones.</p>
      <p><strong>iPhone:</strong> abrí el enlace en Safari → Compartir → Agregar a pantalla de inicio. Después abrila desde su ícono.</p>
      <p>El aviso automático depende del navegador. Si el menú solo permite crear un acceso directo, eso puede no instalar la app completa.</p>
      <label>Enlace para abrir en tu navegador<input aria-label="Enlace de la app" readOnly value={location.origin + '/'} onFocus={event => event.currentTarget.select()}/></label>
      <button type="button" onClick={() => setOpen(false)}>Cerrar ayuda</button>
    </div>}
  </section>;
}
