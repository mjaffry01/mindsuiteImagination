/**
 * Privacy and Cookies notice, in English. The page (components/Privacy.jsx) translates each
 * string with t(); the build (seo/pages.mjs) writes the same text into /privacy for readers
 * without JavaScript, so the two never differ.
 *
 * Two facts depend on how the site is deployed, so they are passed in:
 *   server — a form server sends enquiries (VITE_ENQUIRY_URL set); otherwise the visitor's
 *            own email app sends them
 *   remoteGuide — the guide sends messages to the server (VITE_ASSISTANT_URL set)
 *
 * Every statement here must stay true for the live site. Change it when the site changes.
 */
export const PRIVACY_VERSION = '1.0';
export const PRIVACY_EFFECTIVE = '2026-11-10';
export const PRIVACY_EMAIL = 'privacy@mindsuite.in';
export const GRIEVANCE_OFFICER = 'Data Protection and Grievance Officer';

/** Browser storage the site uses, for the table in "Cookies and browser storage". */
export const STORAGE_ROWS = [
  { name: 'Your shortlist', use: 'The offerings you add to your enquiry, so they are still there when you come back.', kind: 'Essential' },
  { name: 'Language', use: 'The language you choose for the site.', kind: 'Essential' },
  { name: 'Your privacy choice', use: 'Whether you allowed display choices to be remembered, so we don’t ask again.', kind: 'Essential' },
  {
    name: 'Display choices',
    use: 'Hexagon order, smooth scrolling on or off, a collapsed service map and where you moved the guide.',
    kind: 'Only with your permission',
  },
];

/**
 * Sections of the notice. Each has an id, a title and blocks:
 *   'text'  — a paragraph            { p }
 *   'list'  — a bulleted list        { items }
 *   'storage' / 'controls' / 'contact' — drawn by the page from the data above
 */
export function privacySections({ server = false, remoteGuide = false } = {}) {
  return [
    {
      id: 'who',
      title: 'Who we are',
      blocks: [
        { p: 'MindSuite Informatics Private Limited (“MindSuite”, “we”) runs this website. We are based in Hyderabad, Telangana, India.' },
        {
          p: 'For the personal data you give us here, we are the data fiduciary under India’s Digital Personal Data Protection Act 2023 and the data controller under Saudi Arabia’s Personal Data Protection Law.',
        },
      ],
    },
    {
      id: 'collect',
      title: 'What we collect',
      blocks: [
        { p: 'We only collect what you choose to send us:' },
        {
          items: [
            'Proposal requests: your name, work email, company, phone number (optional), how you would like us to contact you, your timeline, your message and the offerings you picked.',
            'Messages you send us yourself by email, phone, WhatsApp or Telegram.',
            remoteGuide && 'What you type to the MindSuite Guide (see “The MindSuite Guide” below).',
          ].filter(Boolean),
        },
        { p: 'We do not use analytics, advertising or tracking tools, and we do not build profiles of visitors.' },
      ],
    },
    {
      id: 'why',
      title: 'Why we use it, and on what basis',
      blocks: [
        {
          items: [
            'To reply to your request and prepare a proposal. Basis: your consent, which you give with the tick box on the form.',
            server && 'To protect the form from abuse, for example by limiting how often one connection can send it. Basis: keeping the service safe and working.',
            'To meet legal obligations, such as keeping records once you become a client.',
          ].filter(Boolean),
        },
        { p: 'We don’t use your details for marketing unless you ask us to, and we never sell them.' },
      ],
    },
    {
      id: 'how',
      title: 'How your request reaches us',
      blocks: [
        server
          ? {
              p: 'When you send the form, our website server emails your request to our team at info@mindsuite.in through our Microsoft 365 business email, and sends you a copy as confirmation. To stop repeated sending, the server holds your connection’s IP address in memory for up to 15 minutes. Its log notes the request reference and your email address.',
            }
          : {
              p: 'When you send the form, it opens your own email app with your request filled in, addressed to info@mindsuite.in. Nothing is sent until you press send there.',
            },
        {
          p: 'Requests are kept in our Microsoft 365 business mailbox, which Microsoft may store in data centres outside India and Saudi Arabia. Only the staff who handle enquiries can read them.',
        },
      ],
    },
    {
      id: 'guide',
      title: 'The MindSuite Guide',
      blocks: [
        remoteGuide
          ? {
              p: 'What you type to the guide is sent to our server to suggest matching offerings. When AI suggestions are switched on, the conversation is passed to Anthropic’s Claude service, which processes it on our behalf. We don’t keep the conversation. The guide doesn’t need personal details, so please don’t include any.',
            }
          : {
              p: 'The guide that helps you choose offerings works entirely in your browser. What you type to it is not sent to us or anyone else, and it is cleared when you leave or reload the page.',
            },
      ],
    },
    {
      id: 'others',
      title: 'Who else is involved',
      blocks: [
        {
          items: [
            'Our hosting and network providers, such as GitHub and Cloudflare, carry the traffic to this site and keep standard technical logs, such as IP addresses, under their own privacy policies.',
            'Microsoft 365 carries and stores our business email.',
            remoteGuide && 'Anthropic provides the AI behind the guide.',
            'Share buttons and links to LinkedIn, WhatsApp, Telegram and Google Maps take you to those services, and their privacy policies then apply. We don’t load their scripts or trackers on this site.',
            'Team photos load from our main website, www.mindsuite.in.',
            'We share personal data with authorities only when the law requires it.',
          ].filter(Boolean),
        },
      ],
    },
    {
      id: 'transfers',
      title: 'Transfers outside India and Saudi Arabia',
      blocks: [
        {
          p: 'Because the providers above run their services internationally, your data may be processed outside the country you are in. We use providers that commit to protecting it, and we follow the transfer rules of India’s DPDP Act and Saudi Arabia’s PDPL.',
        },
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies and browser storage',
      blocks: [
        { p: 'This site sets no cookies and uses no analytics or advertising trackers.' },
        { p: 'It saves a few small settings in your browser’s own storage. They stay on your device and are never sent to us.' },
        { storage: true },
        { p: 'You can change your choice at any time with “Cookie settings” at the bottom of every page, or clear everything this site has saved in your browser.' },
        { controls: true },
      ],
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      blocks: [
        {
          items: [
            'Enquiries that don’t lead to work: up to 24 months, then deleted.',
            'Client contracts and records: for the length of the contract and 7 years after, as the law requires.',
            server && 'Website server logs: up to 180 days.',
            'Settings in your browser: until you clear them.',
          ].filter(Boolean),
        },
      ],
    },
    {
      id: 'rights',
      title: 'Your rights',
      blocks: [
        { p: 'You can ask us to:' },
        {
          items: [
            'tell you what personal data we hold about you and how we use it',
            'correct, complete or update it',
            'delete it when we no longer need it',
            'stop using it, by withdrawing your consent, which is as easy as giving it',
            'let someone you name act for you if you die or can no longer act yourself',
          ],
        },
        {
          p: 'Write to privacy@mindsuite.in. We reply within 30 days. If you are not satisfied with our answer, you can complain to the Data Protection Board of India or, in Saudi Arabia, to the Saudi Data and AI Authority (SDAIA).',
        },
      ],
    },
    {
      id: 'security',
      title: 'Keeping it safe',
      blocks: [
        {
          p: server
            ? 'The site is served only over encrypted HTTPS connections, blocks scripts from other websites and limits how often the form can be sent. Only the staff who handle enquiries can read them. If a breach affects your data, we will tell you and the authorities, as the law requires.'
            : 'The site is served only over encrypted HTTPS connections and blocks scripts from other websites. Only the staff who handle enquiries can read them. If a breach affects your data, we will tell you and the authorities, as the law requires.',
        },
      ],
    },
    {
      id: 'children',
      title: 'Children',
      blocks: [{ p: 'This site is for businesses and is not meant for anyone under 18. We don’t knowingly collect children’s data.' }],
    },
    {
      id: 'contact',
      title: 'Contact and grievance officer',
      blocks: [
        { contact: true },
        {
          p: 'This notice is available on this site in English, Arabic and French. To read it in Hindi, Telugu, Urdu or another language listed in India’s Constitution, write to us.',
        },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this notice',
      blocks: [
        {
          p: 'If we change this notice, we will publish the new version here with a new date. If a change affects how we use data you have already given us, we will ask for your consent again.',
        },
      ],
    },
  ];
}
