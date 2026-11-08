/**
 * Leadership and delivery team, from https://www.mindsuite.in/team.
 * Photos load from mindsuite.in; people without a photo show their initials.
 * To add someone, append an entry; `groups` must use names from GROUPS.
 */

const SITE = 'https://www.mindsuite.in';

export const intro = {
  eyebrow: 'MindSuite / Leadership & Team',
  title: 'People behind connected technology.',
  lead: 'Meet MindSuite’s leadership and the team listed across consulting, engineering, operations, and platform delivery.',
};

export const GROUPS = ['Leads', 'ERP & NetSuite', 'Engineering', 'Cloud & DevOps', 'Business Operations'];

export const leaders = [
  {
    name: 'Ashraf Sheikh Mohammed',
    role: 'CEO & Founder',
    area: 'Business leadership',
    photo: `${SITE}/ceo-img.jpg`,
    linkedin: 'https://www.linkedin.com/in/ashrafsheikh/',
  },
  {
    name: 'Saddapalli Mohammed Zaheer',
    role: 'CTO/Chief Technology Governance Officer',
    area: 'Technology leadership',
    photo: `${SITE}/team/saddapalli-mohammed-zaheer.webp`,
    linkedin: 'https://www.linkedin.com/in/zaheersmd/',
  },
  {
    name: 'Tanvir Hashmi',
    role: 'Cybersecurity, Risk & Compliance Leader',
    area: 'Security leadership',
    photo: `${SITE}/team/tanvir-hashmi.png`,
    linkedin: 'https://www.linkedin.com/in/tanvirh/',
  },
  {
    name: 'Mohammad Ali Jaffry',
    role: 'Head of AI Solutions',
    area: 'AI leadership',
    photo: `${SITE}/team/mohammad-ali-jaffry.webp`,
    linkedin: 'https://www.linkedin.com/in/md-ali-jaffry-57530a274/',
  },
];

const p = (file) => (file ? `${SITE}/team/${file}` : null);
const li = (slug) => `https://www.linkedin.com/in/${slug}`;

export const team = [
  { name: 'Chembeti Tirumalaiah', role: 'Product Director', groups: ['Leads'], photo: null, linkedin: li('tiru-chembeti-ab4a73bb/') },
  { name: 'Mirza Amanulla Baig', role: 'NetSuite Functional Consultant', groups: ['ERP & NetSuite'], photo: p('mirza-amanulla-baig.webp'), linkedin: li('aman-mirza-3a369921a/') },
  { name: 'Alyaan Ahmed Ansari', role: 'NetSuite Technical Consultant', groups: ['ERP & NetSuite'], photo: p('alyaan-ahmed-ansari.webp'), linkedin: li('alyaan/') },
  { name: 'Omar Sheikh', role: 'NetSuite Functional Consultant', groups: ['ERP & NetSuite'], photo: null, linkedin: li('omar-sheikh-46b543294/') },
  { name: 'Mardana Ravi Teja', role: 'QA Engineer', groups: ['Engineering'], photo: p('mardana-ravi-teja.webp'), linkedin: li('maradana-raviteja-977985225/') },
  { name: 'Mohd Salimuddin', role: 'NetSuite Technical Consultant', groups: ['ERP & NetSuite'], photo: p('mohd-salimuddin.webp'), linkedin: li('mohdsalim95/') },
  { name: 'Imraaz Ali Khan', role: 'NetSuite Technical Consultant', groups: ['ERP & NetSuite'], photo: p('imraaz-ali-khan.webp'), linkedin: li('imraaz-ali-khan-117159266/') },
  { name: 'Kothapally Prashanth', role: 'NetSuite Functional Consultant', groups: ['ERP & NetSuite'], photo: p('kothapally-prashanth-face.webp'), linkedin: li('prashanth-kothapally-240659170/') },
  { name: 'Mohammed Murtuza Khan', role: 'Software Developer', groups: ['Engineering'], photo: p('mohammed-murtuza-khan.webp'), linkedin: li('khan39/') },
  { name: 'Ramsaibabu Gorrepotu', role: 'Senior NS Functional Consultant', groups: ['Leads'], photo: p('ramsaibabu-gorrepotu.webp'), linkedin: li('ram-s-82199861/') },
  { name: 'Yusufzai Fawwad', role: 'DevOps Engineer', groups: ['Cloud & DevOps'], photo: p('yusufzai-fawwad.webp'), linkedin: li('yusufzai-fawwad/') },
  { name: 'Syed Danish Syed Ishaque', role: 'Associate Engineer', groups: ['Engineering'], photo: p('syed-danish.webp'), linkedin: li('techdanish/') },
  { name: 'Shaik Fathima Begum', role: 'Associate Engineer', groups: ['Engineering'], photo: null, linkedin: li('fathima28/') },
  { name: 'Ayesha Vilayath Siddiqui', role: 'Associate Engineer', groups: ['Engineering'], photo: null, linkedin: li('ayesha-vilayath/') },
  { name: 'Mohammed Junaid', role: 'Associate Engineer', groups: ['Engineering'], photo: p('mohammed-junaid.webp'), linkedin: li('mohammedjunaidd/') },
  { name: 'Gongati BinduPrasanna', role: 'Associate Engineer', groups: ['Engineering'], photo: p('gongati-binduprasanna.webp'), linkedin: li('binduprasanna-gongati-2668b6290/') },
  { name: 'Mohammed Saifuddin', role: 'Associate Engineer', groups: ['Engineering'], photo: p('mohammed-saifuddin.webp'), linkedin: li('mohammed-saifuddin-34a4761a7/') },
  { name: 'Trisha Nayak', role: 'ERP Section Manager', groups: ['Leads'], photo: null, linkedin: li('trisha-nayak-b22426162/') },
  { name: 'G. Pavan Kumar', role: 'Accountant', groups: ['Business Operations'], photo: null, linkedin: li('pavan-kumar-gudipudi-49727626b/') },
  { name: 'Syeeda Shehnaz Begum', role: 'NetSuite Functional Consultant', groups: ['ERP & NetSuite'], photo: null, linkedin: li('syeeda-shehnaz-begum-08120221b/') },
  { name: 'Mohammad Fairoz Khan', role: 'NetSuite Technical Consultant', groups: ['ERP & NetSuite'], photo: p('mohammad-fairoz-khan.webp'), linkedin: li('m-fairoz-khan-488282255/') },
  { name: 'Syed Mohammed Ali Mohsin', role: 'NetSuite Technical Consultant', groups: ['ERP & NetSuite'], photo: p('syed-mohammed-ali-mohsin.webp'), linkedin: li('syed-mohsin-280733265/') },
  { name: 'Asma Begum', role: 'ERP Functional Consultant', groups: ['ERP & NetSuite'], photo: null, linkedin: li('asma-begum-0960b8228/') },
  { name: 'Shaik Abu Dawood', role: 'POS Analyst', groups: ['Leads'], photo: p('shaik-abu-dawood-face.webp'), linkedin: li('shaik-abu-dawood-69567b321/') },
  { name: 'Mohammed Sadiq', role: 'NetSuite Technical Consultant', groups: ['ERP & NetSuite'], photo: p('mohammed-sadiq.webp'), linkedin: li('mohammed-sadiq-3b2b6a1a2/') },
  { name: 'Abdul Faizan', role: 'Sales Operations Team Lead', groups: ['Business Operations'], photo: p('abdul-faizan.webp'), linkedin: li('abdulfaizan/') },
  { name: 'Maniyar Afroz', role: 'O365 Technical Consultant', groups: ['Business Operations'], photo: p('maniyar-afroz.webp'), linkedin: li('afroz-maniyar-37b59a13b/') },
  { name: 'Mohd. Althaf Hussain', role: 'DevOps Engineer', groups: ['Cloud & DevOps'], photo: p('altaf-hussain.webp'), linkedin: li('mohd-althaf-hussain-077b5a250/') },
  { name: 'Zahershah khan Pathan', role: 'DevOps Engineer', groups: ['Cloud & DevOps'], photo: p('zahershah-khan-pathan.webp'), linkedin: li('zaher-pathan-697150242/') },
  { name: 'Mohd Afeef Ali', role: 'Associate Engineer', groups: ['Engineering'], photo: p('afeef-ali.webp'), linkedin: li('mohd-afeef-ali-b63a2b25a/') },
  { name: 'Meraj Khan', role: 'Automation Architect', groups: ['Engineering', 'Cloud & DevOps'], photo: p('meraj-khan.webp'), linkedin: li('meraj-khan-qa/') },
  { name: 'Shaikh Majid Mahemood', role: 'Associate Engineer', groups: ['Engineering'], photo: p('shaikh-majid-mahemood.webp'), linkedin: li('shaikh-majid-843074325/') },
  { name: 'Borusu Phaneendra', role: 'Associate Engineer', groups: ['Engineering'], photo: p('borusu-phaneendra-face.webp'), linkedin: li('phaneendra-borusu/') },
  { name: 'B. Uthkarsh Jaiswal', role: 'Associate Engineer', groups: ['Engineering'], photo: p('uthkarsh-jaiswal-face.webp'), linkedin: li('uthkarsh-jaiswal-3b427a244/') },
  { name: 'Shaik Mohd Arbaz', role: 'Associate Engineer', groups: ['Engineering'], photo: p('shaik-mohd-arbaz.webp'), linkedin: li('shaikmohdarbaz3835/') },
  { name: 'Ahmer Haider', role: 'Associate Engineer', groups: ['Engineering'], photo: p('ahmer-haider.webp'), linkedin: li('ahmer-haider/') },
  { name: 'Abdul Rahman Khan', role: 'Associate Engineer', groups: ['Engineering'], photo: p('abdul-rahman-khan.webp'), linkedin: li('abdul-rahman-khan-88b327201/') },
  { name: 'Abdul Raheem', role: 'Associate Engineer', groups: ['Engineering'], photo: p('abdul-raheem.webp'), linkedin: li('abdul-raheem-a894771b1') },
  { name: 'Yusufzai Jawwad Khan', role: 'Manager – Bids & Proposals / TAS', groups: ['Leads'], photo: p('yusufzai-jawwad-khan-face.webp'), linkedin: li('yusufzai-jawwad-khan-6435b523b/') },
  { name: 'Venu Guda', role: 'Solution Architect', groups: ['Leads'], photo: null, linkedin: li('venu-guda/') },
];
