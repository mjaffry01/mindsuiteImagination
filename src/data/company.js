/**
 * Company content shown around the catalogue. Edit text here; layout lives in the components.
 *
 * Images: drop files into src/assets/clients, src/assets/platforms or src/assets/leaders,
 * import them at the top of this file and set `logo` / `photo`. Until then a text
 * placeholder is shown. Links left as null render as plain text instead of a link.
 */

export const ecosystem = {
  eyebrow: 'Enterprise technology ecosystem',
  title: ['The right platform.', 'A connected business.'],
  lead: 'Bring finance, operations, and customer relationships together around the systems that fit your business.',
  link: { label: 'Explore platforms & relationships', href: '#family-5' },
  // `area` links each card to the matching service area in the catalogue.
  platforms: [
    { name: 'Oracle NetSuite', caption: 'Cloud ERP', logo: null, area: 'family-5-area-2' },
    { name: 'Odoo', caption: 'Business applications', logo: null, area: 'family-5-area-2' },
    { name: 'ERPNext', caption: 'Open-source ERP', logo: null, area: 'family-5-area-2' },
    { name: 'Reachware Studio', caption: 'iPaaS integration', logo: null, area: 'family-5-area-3' },
    { name: 'Salesforce', caption: 'Customer relationships', logo: null, area: 'family-1-area-4' },
  ],
};

export const clients = {
  eyebrow: 'Our clients',
  title: 'Businesses we work with.',
  lead: 'Technology starts with understanding the people and operations behind each business.',
  list: [
    { name: 'trustangle', logo: null, url: null },
    { name: 'Wateen', logo: null, url: null },
    { name: 'LYNNC', logo: null, url: null },
    { name: 'Omniful', logo: null, url: null },
    { name: 'eddekhar', logo: null, url: null },
    { name: 'TACHYON', logo: null, url: null },
    { name: 'reachware', logo: null, url: null },
    { name: 'Jigsaw', logo: null, url: null },
  ],
};

export const contact = {
  tagline: ['Business systems. Connected technology.', 'A considered path forward.'],
  email: 'info@mindsuite.in',
  phone: '+91 9100 00 5500',
  address: ['8-1-299/A/108, Shaikpet', 'Hyderabad 500 096, Telangana, India'],
  // Opens the address in Google Maps.
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=8-1-299%2FA%2F108%2C+Shaikpet%2C+Hyderabad+500096',
  // Confirm this is MindSuite's company page before going live.
  linkedin: 'https://www.linkedin.com/company/mindsuite/',
};

/**
 * "Talk to an expert" channels. WhatsApp and Telegram open a chat with the number above.
 * Telegram phone links only work if that account allows being found by its number;
 * if MindSuite has a Telegram username, set it here instead (e.g. 'https://t.me/mindsuite').
 */
const digits = contact.phone.replace(/\D/g, '');
const greeting = 'Hello MindSuite, I would like to talk to an expert about ';

export const expertChannels = {
  whatsapp: `https://wa.me/${digits}?text=${encodeURIComponent(greeting)}`,
  telegram: `https://t.me/+${digits}`,
  call: `tel:+${digits}`,
  email: `mailto:${contact.email}?subject=${encodeURIComponent('Talk to an expert')}`,
  linkedin: contact.linkedin,
};
