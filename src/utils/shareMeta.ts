// Auditoria UX T3: meta tags Open Graph dinâmicas para compartilhamento de eventos.
// Como o app é uma SPA, crawlers de WhatsApp/Facebook/LinkedIn leem apenas o HTML estático;
// esta função injeta/atualiza as tags og:* quando a página de detalhes do evento é aberta,
// e restaura os padrões ao sair. Chamada via useEffect em RaceDetailsPage.

const DEFAULT_OG = {
  title: 'Smart Brasil Ticket - Plataforma de Inscrições para Eventos Esportivos',
  description: 'Inscreva-se em corridas, caminhadas e eventos esportivos com pagamento seguro via PIX e cartão.',
  image: '', // sem imagem padrão hospedada; campo vazio evita URL quebrada no card
};

function setMeta(attr: 'property' | 'name', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  if (content) el.setAttribute('content', content);
  else el.removeAttribute('content');
}

export function setEventShareMeta(race: {
  name?: string;
  description?: string;
  image?: string;
  city?: string;
  state?: string;
  date?: string;
}) {
  const title = race.name ? `${race.name} — Smart Brasil Ticket` : DEFAULT_OG.title;
  const where = race.city && race.state ? ` | ${race.city}/${race.state}` : '';
  const when = race.date ? ` | ${new Date(`${race.date}T12:00:00`).toLocaleDateString('pt-BR')}` : '';
  const description = `${(race.description || DEFAULT_OG.description).slice(0, 180)}${where}${when}`;
  const url = window.location.href;

  document.title = title;
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:image', race.image || DEFAULT_OG.image);
  setMeta('property', 'og:locale', 'pt_BR');
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', race.image || DEFAULT_OG.image);
}

export function resetShareMeta() {
  document.title = DEFAULT_OG.title;
  setMeta('property', 'og:title', DEFAULT_OG.title);
  setMeta('property', 'og:description', DEFAULT_OG.description);
  setMeta('property', 'og:image', '');
  setMeta('name', 'twitter:image', '');
}
