/**
 * Company content shown around the catalogue. Edit text here; layout lives in the components.
 *
 * Images: drop files into src/assets/clients, src/assets/platforms or src/assets/leaders,
 * import them at the top of this file and set `logo` / `photo`. Until then a text
 * placeholder is shown. Links left as null render as plain text instead of a link.
 */

export const process = {
  eyebrow: 'How MindSuite works',
  title: 'Know what comes next, at every stage.',
  lead:
    'From understanding your challenge to handing over a working system, use these stages to discuss the scope, responsibilities, and checkpoints for your project.',
  stages: [
    { name: 'Discovery', text: 'Understand workflows, constraints, stakeholders, and what success should look like.' },
    { name: 'Architecture', text: 'Define the system design, integration boundaries, and implementation plan.' },
    { name: 'Delivery', text: 'Build and configure against agreed requirements with review checkpoints.' },
    { name: 'Integration', text: 'Connect systems, validate data, and test end-to-end workflows.' },
    { name: 'Handover', text: 'Prepare documentation, user training, and operational ownership.' },
    { name: 'Support', text: 'Agree maintenance, issue handling, and the scope of ongoing assistance.' },
  ],
};

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

export const leadership = {
  eyebrow: 'Leadership / MindSuite',
  title: 'Leadership, connected.',
  lead: 'Get to know the leadership behind MindSuite’s business, technology, and cybersecurity work.',
  link: { label: 'Meet the full team', href: null },
  leaders: [
    {
      name: 'Ashraf Sheikh Mohammed',
      area: 'Business leadership',
      role: 'CEO & Founder',
      photo: null,
      linkedin: null,
    },
    {
      name: 'Saddapalli Mohammed Zaheer',
      area: 'Technology leadership',
      role: 'CTO/Chief Technology Governance Officer',
      photo: null,
      linkedin: null,
    },
    {
      name: 'Tanvir Hashmi',
      area: 'Security leadership',
      role: 'Cybersecurity, Risk & Compliance Leader',
      photo: null,
      linkedin: null,
    },
  ],
};
