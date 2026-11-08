/**
 * Careers page content. Openings are listed in `openings` below.
 *
 * To publish a role, add an object like this to `openings`:
 *
 *   {
 *     id: 'netsuite-technical-consultant',      // unique, used in the page link
 *     title: 'NetSuite Technical Consultant',
 *     discipline: 'ERP & NetSuite',             // one of DISCIPLINES[].name
 *     location: 'Hyderabad, India',
 *     workModel: 'On-site',                     // On-site | Hybrid | Remote
 *     type: 'Full-time',
 *     experience: '3–5 years',
 *     posted: '2026-11-01',                     // YYYY-MM-DD
 *     summary: 'One or two sentences on the role.',
 *     responsibilities: ['…', '…'],
 *     requirements: ['…', '…'],
 *     niceToHave: ['…'],                        // optional
 *   }
 *
 * mindsuite.in/careers listed no openings when this page was built, so the list starts empty
 * and the page shows a "no openings right now" message with a way to send a CV.
 */

export const careersContact = {
  email: 'info@mindsuite.in', // replace with a dedicated careers address if you have one
};

export const hero = {
  eyebrow: 'Careers at MindSuite',
  title: ['Bring your expertise', 'to connected technology.'],
  lead: 'Join the team behind MindSuite’s software, cloud, AI, security and ERP work. Browse current vacancies with their responsibilities, requirements, location and work model.',
};

export const perks = [
  {
    icon: 'Layers',
    title: 'Work across the whole stack',
    text: 'Projects span software, cloud, AI, cybersecurity and ERP, so you see how connected systems fit together.',
  },
  {
    icon: 'Users',
    title: 'Learn from experienced leads',
    text: 'Work alongside solution architects, senior consultants and practice leads on real client delivery.',
  },
  {
    icon: 'Compass',
    title: 'Clients across regions',
    text: 'Contribute to delivery for businesses in India, the Middle East, the Gulf and Western markets.',
  },
  {
    icon: 'ClipboardCheck',
    title: 'Clear outcomes, named ownership',
    text: 'Every engagement starts with agreed deliverables and acceptance criteria, so you know what good looks like.',
  },
  {
    icon: 'Rocket',
    title: 'Grow with the practice',
    text: 'As MindSuite adds services and clients, there is room to take on more responsibility and specialise.',
  },
  {
    icon: 'HeartPulse',
    title: 'Our people’s passion',
    text: 'It is part of our mission: Our Customers’ Success. Our People’s Passion. Our World’s Progress.',
  },
];

/** Disciplines from mindsuite.in/careers; `group` links each to the matching team filter. */
export const DISCIPLINES = [
  { name: 'ERP & NetSuite', area: 'ERP & Business Systems', icon: 'Building2', group: 'ERP & NetSuite' },
  { name: 'Engineering', area: 'Software Development', icon: 'CodeXml', group: 'Engineering' },
  { name: 'Cloud & DevOps', area: 'DevOps & Platform Engineering', icon: 'CloudCog', group: 'Cloud & DevOps' },
  { name: 'Business Operations', area: 'Across the business', icon: 'BriefcaseBusiness', group: 'Business Operations' },
  { name: 'Leads & Specialists', area: 'Across the business', icon: 'Compass', group: 'Leads' },
];

export const steps = [
  {
    title: 'Review the role',
    text: 'Read the responsibilities, required skills, location and work model listed for the opening.',
  },
  {
    title: 'Send your application',
    text: 'Apply with your contact details and CV. The email opens with the role already in the subject line.',
  },
  {
    title: 'Confirm next steps',
    text: 'MindSuite follows up using your application details. Ask about selection stages, timing and role-specific terms.',
  },
];

export const openings = [];
