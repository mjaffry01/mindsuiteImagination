/**
 * Narration for the voice tour of the offerings: an introduction, one stop per service family,
 * and a closing stop. Each family stop gives the family's promise, then walks through every
 * service area in a sentence, written from the offerings that area contains. Family and area
 * names and counts come from the catalogue, so they stay true as offerings change; when an
 * area is added, write its sentence in AREAS below for each language.
 *
 * Shared by the website (src/components/VoiceTour.jsx) and the recording script
 * (tools/voice-tour-audio.mjs), so it must not import anything. Each stop carries a hash of
 * its text: a recording is only played while its hash still matches, and the script only
 * re-records stops whose text has changed.
 */

const WORDS = {
  en: {
    introTitle: 'Welcome to MindSuite',
    intro: ({ families, offerings }) =>
      `Welcome to MindSuite. In about ten minutes I'll walk you through our ${families} service families and ${offerings} defined offerings, each with a clear scope, deliverables and business value. Every family has its own stop: use the next button to skip ahead, or the bar below to jump straight to the one you need. Pause whenever you like, and add anything that interests you to your enquiry.`,
    count: ({ count, areas }) => `It brings together ${count} offerings in ${areas} service areas.`,
    outroTitle: 'Your next step',
    outro: () =>
      "That's the MindSuite offering map. Every offering you heard about has its own card on this page, with the full scope, deliverables and business value. Add the ones that fit your plans to your enquiry and send it in one step. Our team will acknowledge it within one business day. Thank you for listening.",
    pitch: {
      'family-1': 'We help you build software that is easier to change and cheaper to run.',
      'family-2': 'We automate how your software is built, tested and released, on a cloud platform that is secure, observable and cost-aware.',
      'family-3': 'We find the work worth automating, connect AI to your own knowledge, and run it in production with the right controls.',
      'family-4': 'We help you see where you are exposed, protect what matters most, and respond quickly when something happens.',
      'family-5': 'We take ERP from first blueprint to a live system your teams rely on, and keep improving it after go-live.',
      'family-6': 'Whether you need one specialist or a whole team, our people work inside your process and to your standards.',
      'family-7': 'We look after your IT estate day to day, so your people can focus on the business.',
      'family-8': 'Fixes, updates and performance work arrive on a regular rhythm, so small problems never grow into big ones.',
      'family-9': 'We redesign how the business works, bring your people through the change, and help you grow with your customers.',
    },
    areas: {
      'family-1-area-1': 'Health checks, risk assessments and technology due diligence show where your software really stands, and an architecture review and roadmap set out what to do next.',
      'family-1-area-2': 'We take a product from discovery and validation, through UX design and prototyping, to a first release, then build and grow web, mobile and SaaS platforms.',
      'family-1-area-3': 'We assess technical debt and legacy applications, upgrade frameworks and databases, renew the architecture, and re-engineer in safe phases rather than one risky rewrite.',
      'family-1-area-4': 'We design and build APIs, set up gateways, and connect your business systems, partners and event-driven workflows, and we diagnose and repair integrations that break.',
      'family-1-area-5': 'We select and set up identity platforms, add single sign-on, roles and permissions, migrate identity systems, and automate how user access is granted and removed.',
      'family-1-area-6': 'A test strategy, automated testing and a release-readiness check help you ship with confidence.',
      'family-1-area-7': 'Performance and resilience testing, continuous reliability improvement and managed support keep applications dependable once they are live.',
      'family-2-area-1': 'Health checks and bottleneck reviews show where delivery slows down, and a toolchain roadmap and operating model show how to fix it.',
      'family-2-area-2': 'We set up secure cloud foundations, manage infrastructure as code, create environments automatically, control configuration drift, put backup and recovery in place, and migrate workloads to the cloud.',
      'family-2-area-3': 'We containerise applications, build and upgrade container platforms, automate deployments with GitOps, and give developers self-service workflows.',
      'family-2-area-4': 'Continuous integration and delivery pipelines, a release and branching strategy, artifact management, and progressive rollouts with safe rollback.',
      'family-2-area-5': 'Security checks inside the pipeline, secrets management, software supply-chain controls, policy as code, and automated evidence for audits.',
      'family-2-area-6': 'Monitoring and observability, reliability targets and alerting, operational readiness reviews, and root-cause analysis when incidents happen.',
      'family-2-area-7': 'Cost reviews and savings roadmaps, rightsizing, budget controls, patching, and automation of routine operations.',
      'family-3-area-1': 'A short value sprint and opportunity assessment find where AI pays off, check that your data and access are ready, and help you choose a platform and prepare your team.',
      'family-3-area-2': 'We add AI to your own products: in-app assistants, summaries and drafts, conversational access to product data, and multi-tenant AI APIs.',
      'family-3-area-3': 'Search and knowledge assistants answer from your own sources, show where each answer came from, and respect who is allowed to see what.',
      'family-3-area-4': 'Documents are classified, routed, read and checked automatically, and the results flow into your systems, with people reviewing where needed.',
      'family-3-area-5': 'Service requests are understood and routed, replies and next steps are drafted, and task agents work with your CRM, ERP and helpdesk, with approvals built in.',
      'family-3-area-6': 'We bring AI coding tools into your engineering team, from a pilot and onboarding to AI-assisted code review, testing, codebase understanding and pipeline troubleshooting.',
      'family-3-area-7': 'AI triages alerts, helps investigate incidents, guides recovery with human approval, and writes up summaries and follow-up actions.',
      'family-3-area-8': 'Quality evaluation and regression testing, permissions and audit controls, deployment and cost controls, and ongoing improvement keep AI reliable in production.',
      'family-4-area-1': 'Threat modelling, threat intelligence, penetration testing, and red and purple team exercises show how an attacker would really get in.',
      'family-4-area-2': 'We secure networks and endpoints, cloud-native workloads, data, AI and generative AI systems, and operational technology.',
      'family-4-area-3': 'Identity and privileged access management, and a zero trust architecture where every access is verified.',
      'family-4-area-4': 'A virtual CISO and board advisory, security governance and cyber risk management give you security leadership without a full-time hire.',
      'family-4-area-5': 'We build compliance programmes and prepare you for audits, with the evidence ready.',
      'family-4-area-6': 'We find and prioritise vulnerabilities, map your attack surface, secure application development, and track remediation through to closure.',
      'family-4-area-7': 'Security monitoring and SOC services, incident and ransomware readiness, incident response, and digital forensics.',
      'family-4-area-8': 'Ransomware readiness, business continuity planning and tested disaster recovery, so you can recover when it matters.',
      'family-5-area-1': 'We map your business processes, select the right ERP platform, and design the solution before anything is built.',
      'family-5-area-2': 'We configure, extend and test ERP, with proven flows on NetSuite, Odoo, ERPNext and Microsoft Dynamics 365, and integration through Reachware.',
      'family-5-area-3': 'We migrate and reconcile your data, plan the cutover, and connect ERP with CRM, Salesforce, Shopify, point of sale and older applications.',
      'family-5-area-4': 'Training and go-live readiness, ongoing support, health checks, targeted improvements and operational dashboards.',
      'family-6-area-1': 'Frontend, backend, full-stack, mobile and test automation engineers.',
      'family-6-area-2': 'UX, UI and product designers, business analysts, product owner support, and technical writers.',
      'family-6-area-3': 'DevOps, cloud, site reliability and platform engineers, and database administrators.',
      'family-6-area-4': 'Data engineers, BI and reporting analysts, machine learning, AI and LLM engineers, and MLOps engineers.',
      'family-6-area-5': 'ERP functional consultants and technical developers, CRM and integration developers, and ERP support analysts.',
      'family-6-area-6': 'Choose staff augmentation, a project-based team or a dedicated team, whichever fits how you work.',
      'family-7-area-1': 'Infrastructure and application monitoring, a help desk for your users, and incident and problem management.',
      'family-7-area-2': 'Management of servers, networks and storage, cloud operations, and devices and endpoints.',
      'family-7-area-3': 'Security monitoring and endpoint protection, backup and disaster recovery, and compliance support with regular service reports.',
      'family-8-area-1': 'Application monitoring, emergency support for critical issues, and bug fixing.',
      'family-8-area-2': 'Regular updates and small enhancements, security patching, and platform and version upgrades.',
      'family-8-area-3': 'Performance optimisation, preventive maintenance and health checks, and clear service levels with support reporting.',
      'family-9-area-1': 'Operational excellence reviews, process re-engineering, and aligning technology and systems with how the business runs.',
      'family-9-area-2': 'Change management, organisation and culture change, and leadership alignment, so new ways of working actually stick.',
      'family-9-area-3': 'Innovation and growth strategy, market positioning, and customer journey and service design.',
    },
  },
  fr: {
    introTitle: 'Bienvenue chez MindSuite',
    intro: ({ families, offerings }) =>
      `Bienvenue chez MindSuite. En une dizaine de minutes, je vous présente nos ${families} familles de services et nos ${offerings} offres, chacune avec un périmètre, des livrables et une valeur métier clairement définis. Chaque famille a son étape : utilisez le bouton suivant pour avancer, ou la barre ci-dessous pour aller directement à celle qui vous intéresse. Mettez en pause quand vous le souhaitez, et ajoutez à votre demande tout ce qui vous intéresse.`,
    count: ({ count, areas }) => `Elle réunit ${count} offres dans ${areas} domaines de service.`,
    outroTitle: 'Votre prochaine étape',
    outro: () =>
      'Voilà la carte des offres MindSuite. Chaque offre présentée a sa propre fiche sur cette page, avec son périmètre, ses livrables et sa valeur métier. Ajoutez à votre demande celles qui correspondent à vos projets et envoyez-la en une seule étape. Notre équipe en accusera réception sous un jour ouvré. Merci de votre écoute.',
    pitch: {
      'family-1': 'Nous vous aidons à bâtir des logiciels plus faciles à faire évoluer et moins coûteux à exploiter.',
      'family-2': 'Nous automatisons la construction, les tests et la mise en production de vos logiciels, sur une plateforme cloud sécurisée, observable et maîtrisée en coûts.',
      'family-3': "Nous identifions les tâches qui méritent d'être automatisées, connectons l'IA à vos connaissances et l'exploitons en production avec les bons contrôles.",
      'family-4': 'Nous vous aidons à voir où vous êtes exposés, à protéger l’essentiel et à réagir vite en cas d’incident.',
      'family-5': 'Nous menons votre ERP du premier plan directeur jusqu’à un système en production sur lequel vos équipes s’appuient, et continuons de l’améliorer.',
      'family-6': "Qu'il vous faille un spécialiste ou une équipe complète, nos experts travaillent selon vos processus et vos standards.",
      'family-7': 'Nous prenons en charge votre parc informatique au quotidien, pour que vos équipes se concentrent sur leur métier.',
      'family-8': 'Correctifs, mises à jour et optimisations arrivent à un rythme régulier, pour que les petits problèmes ne deviennent jamais grands.',
      'family-9': 'Nous repensons le fonctionnement de l’entreprise, accompagnons vos équipes dans le changement et vous aidons à croître avec vos clients.',
    },
    areas: {
      'family-1-area-1': "Bilans de santé, évaluations des risques et due diligence technologique montrent où en est réellement votre logiciel ; une revue d'architecture et une feuille de route fixent la suite.",
      'family-1-area-2': "Nous menons un produit de la découverte et de la validation, en passant par le design UX et le prototypage, jusqu'à une première version, puis nous construisons et faisons évoluer des plateformes web, mobiles et SaaS.",
      'family-1-area-3': "Nous évaluons la dette technique et les applications existantes, mettons à niveau frameworks et bases de données, renouvelons l'architecture et réécrivons par étapes maîtrisées plutôt qu'en une refonte risquée.",
      'family-1-area-4': 'Nous concevons et développons des API, configurons des passerelles et connectons vos systèmes métier, vos partenaires et vos flux événementiels ; nous diagnostiquons et réparons aussi les intégrations défaillantes.',
      'family-1-area-5': "Nous choisissons et configurons des plateformes d'identité, ajoutons l'authentification unique, les rôles et les permissions, migrons les systèmes d'identité et automatisons l'attribution et le retrait des accès.",
      'family-1-area-6': 'Une stratégie de test, des tests automatisés et une vérification avant mise en production vous permettent de livrer en confiance.',
      'family-1-area-7': 'Tests de performance et de résilience, amélioration continue de la fiabilité et support managé assurent la solidité des applications en production.',
      'family-2-area-1': "Bilans de santé et analyses des goulots d'étranglement montrent où la livraison ralentit ; une feuille de route d'outillage et un modèle opérationnel montrent comment y remédier.",
      'family-2-area-2': "Nous mettons en place des fondations cloud sécurisées, gérons l'infrastructure as code, créons les environnements automatiquement, maîtrisons les dérives de configuration, mettons en œuvre sauvegarde et reprise, et migrons vos charges vers le cloud.",
      'family-2-area-3': 'Nous conteneurisons les applications, construisons et mettons à niveau les plateformes de conteneurs, automatisons les déploiements avec GitOps et offrons aux développeurs des parcours en libre-service.',
      'family-2-area-4': "Pipelines d'intégration et de livraison continues, stratégie de versions et de branches, gestion des artefacts, et déploiements progressifs avec retour arrière sécurisé.",
      'family-2-area-5': "Contrôles de sécurité intégrés au pipeline, gestion des secrets, contrôles de la chaîne d'approvisionnement logicielle, policy as code et preuves automatisées pour les audits.",
      'family-2-area-6': "Supervision et observabilité, objectifs de fiabilité et alertes, revues de préparation opérationnelle, et analyse des causes profondes en cas d'incident.",
      'family-2-area-7': "Revues des coûts et feuilles de route d'économies, dimensionnement au plus juste, contrôle budgétaire, correctifs et automatisation des opérations courantes.",
      'family-3-area-1': "Un sprint de valeur et une évaluation des opportunités identifient où l'IA est rentable, vérifient que vos données et vos accès sont prêts, et vous aident à choisir une plateforme et à préparer vos équipes.",
      'family-3-area-2': "Nous intégrons l'IA à vos propres produits : assistants intégrés, résumés et brouillons, accès conversationnel aux données du produit et API d'IA multi-clients.",
      'family-3-area-3': "Des assistants de recherche et de connaissance répondent à partir de vos propres sources, indiquent l'origine de chaque réponse et respectent les droits d'accès de chacun.",
      'family-3-area-4': "Les documents sont classés, orientés, lus et vérifiés automatiquement, et les résultats alimentent vos systèmes, avec une relecture humaine quand c'est nécessaire.",
      'family-3-area-5': 'Les demandes sont comprises et orientées, les réponses et prochaines étapes sont rédigées, et des agents travaillent avec votre CRM, votre ERP et votre helpdesk, avec des validations intégrées.',
      'family-3-area-6': "Nous introduisons les outils de codage IA dans vos équipes, du pilote et de la prise en main jusqu'à la revue de code, aux tests, à la compréhension du code et au dépannage des pipelines assistés par l'IA.",
      'family-3-area-7': "L'IA trie les alertes, aide à investiguer les incidents, guide la remise en service avec validation humaine et rédige les synthèses et les actions de suivi.",
      'family-3-area-8': "Évaluation de la qualité et tests de non-régression, permissions et contrôles d'audit, maîtrise des déploiements et des coûts, et amélioration continue gardent l'IA fiable en production.",
      'family-4-area-1': "Modélisation des menaces, renseignement sur les menaces, tests d'intrusion et exercices red team et purple team montrent comment un attaquant entrerait réellement.",
      'family-4-area-2': "Nous sécurisons réseaux et terminaux, charges cloud natives, données, systèmes d'IA et d'IA générative, ainsi que les technologies opérationnelles.",
      'family-4-area-3': 'Gestion des identités et des accès à privilèges, et architecture zero trust où chaque accès est vérifié.',
      'family-4-area-4': 'Un RSSI virtuel et un conseil auprès de la direction, la gouvernance de la sécurité et la gestion des risques cyber vous apportent un leadership sécurité sans recrutement à temps plein.',
      'family-4-area-5': 'Nous bâtissons vos programmes de conformité et vous préparons aux audits, preuves à l’appui.',
      'family-4-area-6': "Nous identifions et priorisons les vulnérabilités, cartographions votre surface d'attaque, sécurisons le développement applicatif et suivons la remédiation jusqu'à son terme.",
      'family-4-area-7': 'Supervision de la sécurité et services SOC, préparation aux incidents et aux rançongiciels, réponse aux incidents et investigation numérique.',
      'family-4-area-8': "Préparation aux rançongiciels, plan de continuité d'activité et reprise après sinistre testée, pour pouvoir redémarrer quand cela compte.",
      'family-5-area-1': 'Nous cartographions vos processus, sélectionnons la bonne plateforme ERP et concevons la solution avant toute réalisation.',
      'family-5-area-2': "Nous configurons, étendons et testons l'ERP, avec des flux éprouvés sur NetSuite, Odoo, ERPNext et Microsoft Dynamics 365, et l'intégration via Reachware.",
      'family-5-area-3': "Nous migrons et rapprochons vos données, préparons la bascule et connectons l'ERP au CRM, à Salesforce, à Shopify, aux caisses et aux applications existantes.",
      'family-5-area-4': 'Formation et préparation au démarrage, support continu, bilans de santé, améliorations ciblées et tableaux de bord opérationnels.',
      'family-6-area-1': "Ingénieurs frontend, backend, full-stack, mobiles et d'automatisation des tests.",
      'family-6-area-2': 'Designers UX, UI et produit, analystes métier, appui au product owner et rédacteurs techniques.',
      'family-6-area-3': 'Ingénieurs DevOps, cloud, fiabilité de site et plateforme, et administrateurs de bases de données.',
      'family-6-area-4': 'Ingénieurs data, analystes BI et reporting, ingénieurs machine learning, IA et LLM, et ingénieurs MLOps.',
      'family-6-area-5': 'Consultants fonctionnels et développeurs techniques ERP, développeurs CRM et intégration, et analystes support ERP.',
      'family-6-area-6': "Renfort d'équipe, équipe projet ou équipe dédiée : choisissez le modèle qui correspond à votre façon de travailler.",
      'family-7-area-1': "Supervision de l'infrastructure et des applications, centre de support pour vos utilisateurs, et gestion des incidents et des problèmes.",
      'family-7-area-2': 'Gestion des serveurs, des réseaux et du stockage, exploitation cloud, et gestion des postes et terminaux.',
      'family-7-area-3': 'Supervision de la sécurité et protection des terminaux, sauvegarde et reprise après sinistre, et accompagnement conformité avec des rapports de service réguliers.',
      'family-8-area-1': 'Supervision des applications, support d’urgence pour les incidents critiques et correction des anomalies.',
      'family-8-area-2': 'Mises à jour régulières et petites évolutions, correctifs de sécurité, et montées de version des plateformes.',
      'family-8-area-3': 'Optimisation des performances, maintenance préventive et bilans de santé, et niveaux de service clairs avec reporting.',
      'family-9-area-1': "Revues d'excellence opérationnelle, refonte des processus, et alignement des technologies et des systèmes sur le fonctionnement de l'entreprise.",
      'family-9-area-2': "Conduite du changement, évolution de l'organisation et de la culture, et alignement des dirigeants, pour que les nouvelles façons de travailler s'installent vraiment.",
      'family-9-area-3': "Stratégie d'innovation et de croissance, positionnement sur le marché, et conception des parcours clients et des services.",
    },
  },
  ar: {
    introTitle: 'مرحبًا بكم في MindSuite',
    intro: ({ families, offerings }) =>
      `مرحبًا بكم في MindSuite. خلال نحو عشر دقائق سأعرّفكم على ${families} من مجموعات خدماتنا و${offerings} من العروض المحددة، لكلٍّ منها نطاق واضح ومخرجات وقيمة للأعمال. لكل مجموعة محطتها الخاصة: استخدموا زر التالي للتقدم، أو الشريط أدناه للانتقال مباشرة إلى ما تحتاجونه. يمكنكم الإيقاف المؤقت في أي وقت، وإضافة ما يهمّكم إلى طلبكم.`,
    count: ({ count, areas }) => `تضم ${count} من العروض في ${areas} من مجالات الخدمة.`,
    outroTitle: 'خطوتكم التالية',
    outro: () =>
      'هذه خريطة عروض MindSuite. لكل عرض استمعتم إليه بطاقته الخاصة في هذه الصفحة، مع نطاقه الكامل ومخرجاته وقيمته للأعمال. أضيفوا ما يناسب خططكم إلى طلبكم وأرسلوه بخطوة واحدة، وسيؤكد فريقنا استلامه خلال يوم عمل واحد. شكرًا لاستماعكم.',
    pitch: {
      'family-1': 'نساعدكم على بناء برمجيات أسهل في التطوير وأقل كلفة في التشغيل.',
      'family-2': 'نؤتمت بناء برمجياتكم واختبارها وإطلاقها، على منصة سحابية آمنة وقابلة للمراقبة وواعية بالتكاليف.',
      'family-3': 'نحدد الأعمال التي تستحق الأتمتة، ونربط الذكاء الاصطناعي بمعارفكم، ونشغّله في الإنتاج مع الضوابط المناسبة.',
      'family-4': 'نساعدكم على معرفة مواطن الانكشاف، وحماية الأهم، والاستجابة بسرعة عند وقوع أي حادث.',
      'family-5': 'ننقل نظام ERP من المخطط الأول إلى نظام عامل تعتمد عليه فرقكم، ونواصل تحسينه بعد الإطلاق.',
      'family-6': 'سواء احتجتم إلى متخصص واحد أو فريق كامل، يعمل خبراؤنا وفق إجراءاتكم ومعاييركم.',
      'family-7': 'نتولى بيئتكم التقنية يومًا بيوم، ليتفرغ فريقكم لأعماله.',
      'family-8': 'تصلكم الإصلاحات والتحديثات وتحسينات الأداء بإيقاع منتظم، حتى لا تكبر المشكلات الصغيرة.',
      'family-9': 'نعيد تصميم طريقة عمل المؤسسة، ونرافق فرقكم خلال التغيير، ونساعدكم على النمو مع عملائكم.',
    },
    areas: {
      'family-1-area-1': 'تكشف فحوصات السلامة وتقييمات المخاطر والعناية الواجبة التقنية الوضع الحقيقي لبرمجياتكم، وتحدد مراجعة البنية وخارطة الطريق الخطوات التالية.',
      'family-1-area-2': 'ننقل المنتج من الاستكشاف والتحقق، مرورًا بتصميم تجربة المستخدم والنماذج الأولية، وصولًا إلى الإصدار الأول، ثم نبني منصات الويب والجوال والبرمجيات كخدمة ونطوّرها.',
      'family-1-area-3': 'نقيّم الديون التقنية والتطبيقات القديمة، ونحدّث الأطر وقواعد البيانات، ونجدد البنية، ونعيد الهندسة على مراحل آمنة بدلًا من إعادة كتابة شاملة محفوفة بالمخاطر.',
      'family-1-area-4': 'نصمم واجهات برمجة التطبيقات ونطورها، ونهيئ البوابات، ونربط أنظمة أعمالكم وشركاءكم وسير العمل القائم على الأحداث، ونشخّص التكاملات المتعطلة ونصلحها.',
      'family-1-area-5': 'نختار منصات الهوية ونهيئها، ونضيف تسجيل الدخول الموحد والأدوار والصلاحيات، ونرحّل أنظمة الهوية، ونؤتمت منح وصول المستخدمين وسحبه.',
      'family-1-area-6': 'تساعدكم استراتيجية الاختبار والاختبار المؤتمت والتحقق من جاهزية الإصدار على الإطلاق بثقة.',
      'family-1-area-7': 'تحافظ اختبارات الأداء والمرونة والتحسين المستمر للموثوقية والدعم المُدار على اعتمادية التطبيقات بعد تشغيلها.',
      'family-2-area-1': 'تكشف فحوصات السلامة ومراجعات الاختناقات مواضع تباطؤ التسليم، وتوضح خارطة طريق الأدوات ونموذج التشغيل كيفية معالجتها.',
      'family-2-area-2': 'نؤسس بنية سحابية آمنة، وندير البنية التحتية بالشيفرة، ونجهّز البيئات آليًا، ونضبط انحراف الإعدادات، وننفذ النسخ الاحتياطي والاستعادة، وننقل أحمال العمل إلى السحابة.',
      'family-2-area-3': 'نحوّل التطبيقات إلى حاويات، ونبني منصات الحاويات ونحدّثها، ونؤتمت النشر باستخدام GitOps، ونوفر للمطورين مسارات خدمة ذاتية.',
      'family-2-area-4': 'خطوط التكامل والتسليم المستمرين، واستراتيجية الإصدارات والفروع، وإدارة الحزم، والإطلاق التدريجي مع إمكانية التراجع الآمن.',
      'family-2-area-5': 'فحوصات أمنية داخل خط التسليم، وإدارة الأسرار، وضوابط سلسلة توريد البرمجيات، والسياسات بالشيفرة، وأدلة مؤتمتة لعمليات التدقيق.',
      'family-2-area-6': 'المراقبة وقابلية الرصد، وأهداف الموثوقية والتنبيهات، ومراجعات الجاهزية التشغيلية، وتحليل الأسباب الجذرية عند وقوع الحوادث.',
      'family-2-area-7': 'مراجعات التكاليف وخطط التوفير، وضبط حجم الموارد، وضوابط الميزانية، والتحديثات الأمنية، وأتمتة العمليات الروتينية.',
      'family-3-area-1': 'يحدد سباق القيمة وتقييم الفرص أين يحقق الذكاء الاصطناعي عائدًا، ويتحقق من جاهزية بياناتكم وصلاحيات الوصول، ويساعدكم على اختيار المنصة وتجهيز فريقكم.',
      'family-3-area-2': 'نضيف الذكاء الاصطناعي إلى منتجاتكم: مساعدون داخل التطبيق، وملخصات ومسودات، ووصول حواري إلى بيانات المنتج، وواجهات ذكاء اصطناعي متعددة المستأجرين.',
      'family-3-area-3': 'مساعدو بحث ومعرفة يجيبون من مصادركم، ويذكرون مصدر كل إجابة، ويحترمون صلاحيات كل مستخدم.',
      'family-3-area-4': 'تُصنَّف المستندات وتُوجَّه وتُقرأ وتُدقَّق آليًا، وتنتقل النتائج إلى أنظمتكم مع مراجعة بشرية عند الحاجة.',
      'family-3-area-5': 'تُفهم طلبات الخدمة وتُوجَّه، وتُصاغ الردود والخطوات التالية، ويعمل وكلاء المهام مع أنظمة CRM وERP ومكتب المساعدة، مع موافقات مدمجة.',
      'family-3-area-6': 'ندخل أدوات البرمجة بالذكاء الاصطناعي إلى فرقكم الهندسية، من التجربة والتأهيل إلى مراجعة الشيفرة والاختبار وفهم قاعدة الشيفرة ومعالجة أعطال خطوط التسليم.',
      'family-3-area-7': 'يفرز الذكاء الاصطناعي التنبيهات، ويساعد في التحقيق في الحوادث، ويوجّه الاستعادة بموافقة بشرية، ويكتب الملخصات وإجراءات المتابعة.',
      'family-3-area-8': 'يحافظ تقييم الجودة واختبارات الانحدار، وضوابط الصلاحيات والتدقيق، وضوابط النشر والتكلفة، والتحسين المستمر، على موثوقية الذكاء الاصطناعي في الإنتاج.',
      'family-4-area-1': 'تكشف نمذجة التهديدات واستخبارات التهديدات واختبارات الاختراق وتمارين الفريق الأحمر والبنفسجي كيف يمكن لمهاجم أن يدخل فعلًا.',
      'family-4-area-2': 'نؤمّن الشبكات والأجهزة الطرفية، وأحمال العمل السحابية، والبيانات، وأنظمة الذكاء الاصطناعي والذكاء الاصطناعي التوليدي، والتقنيات التشغيلية.',
      'family-4-area-3': 'إدارة الهوية والوصول المميز، وبنية الثقة الصفرية التي تتحقق من كل وصول.',
      'family-4-area-4': 'يوفر لكم مسؤول أمن معلومات افتراضي واستشارات لمجلس الإدارة، مع حوكمة الأمن وإدارة المخاطر السيبرانية، قيادةً أمنية دون توظيف بدوام كامل.',
      'family-4-area-5': 'نبني برامج الامتثال ونجهّزكم لعمليات التدقيق، مع أدلة جاهزة.',
      'family-4-area-6': 'نكتشف الثغرات ونرتّب أولوياتها، ونرسم سطح الهجوم، ونؤمّن تطوير التطبيقات، ونتابع المعالجة حتى الإغلاق.',
      'family-4-area-7': 'المراقبة الأمنية وخدمات مركز العمليات الأمنية، والجاهزية للحوادث وبرمجيات الفدية، والاستجابة للحوادث، والتحليل الجنائي الرقمي.',
      'family-4-area-8': 'الجاهزية لبرمجيات الفدية، وتخطيط استمرارية الأعمال، والتعافي من الكوارث المُختبَر، لتتمكنوا من الاستعادة عندما يكون الأمر مهمًا.',
      'family-5-area-1': 'نرسم عمليات أعمالكم، ونختار منصة ERP المناسبة، ونصمم الحل قبل البدء في البناء.',
      'family-5-area-2': 'نهيئ نظام ERP ونوسّعه ونختبره، مع مسارات مجرّبة على NetSuite وOdoo وERPNext وMicrosoft Dynamics 365، والتكامل عبر Reachware.',
      'family-5-area-3': 'نرحّل بياناتكم ونطابقها، ونخطط للانتقال، ونربط ERP بأنظمة CRM وSalesforce وShopify ونقاط البيع والتطبيقات القديمة.',
      'family-5-area-4': 'التدريب والجاهزية للإطلاق، والدعم المستمر، وفحوصات السلامة، والتحسينات المستهدفة، ولوحات المتابعة التشغيلية.',
      'family-6-area-1': 'مهندسو الواجهات الأمامية والخلفية، ومهندسو التطوير الشامل والجوال، ومهندسو أتمتة الاختبار.',
      'family-6-area-2': 'مصممو تجربة المستخدم والواجهات والمنتجات، ومحللو الأعمال، ودعم مالك المنتج، والكتّاب التقنيون.',
      'family-6-area-3': 'مهندسو DevOps والسحابة وموثوقية المواقع والمنصات، ومديرو قواعد البيانات.',
      'family-6-area-4': 'مهندسو البيانات، ومحللو ذكاء الأعمال والتقارير، ومهندسو تعلم الآلة والذكاء الاصطناعي والنماذج اللغوية، ومهندسو MLOps.',
      'family-6-area-5': 'مستشارو ERP الوظيفيون ومطوروه التقنيون، ومطورو CRM والتكامل، ومحللو دعم ERP.',
      'family-6-area-6': 'اختاروا تعزيز الفريق، أو فريقًا لمشروع، أو فريقًا مخصصًا، بحسب طريقة عملكم.',
      'family-7-area-1': 'مراقبة البنية التحتية والتطبيقات، ومكتب مساعدة لمستخدميكم، وإدارة الحوادث والمشكلات.',
      'family-7-area-2': 'إدارة الخوادم والشبكات والتخزين، وعمليات السحابة، والأجهزة والأطراف.',
      'family-7-area-3': 'المراقبة الأمنية وحماية الأجهزة الطرفية، والنسخ الاحتياطي والتعافي من الكوارث، ودعم الامتثال مع تقارير خدمة منتظمة.',
      'family-8-area-1': 'مراقبة التطبيقات، ودعم طارئ للمشكلات الحرجة، وإصلاح الأخطاء.',
      'family-8-area-2': 'تحديثات منتظمة وتحسينات صغيرة، وتحديثات أمنية، وترقيات المنصات والإصدارات.',
      'family-8-area-3': 'تحسين الأداء، والصيانة الوقائية وفحوصات السلامة، ومستويات خدمة واضحة مع تقارير الدعم.',
      'family-9-area-1': 'مراجعات التميز التشغيلي، وإعادة هندسة العمليات، ومواءمة التقنية والأنظمة مع طريقة عمل المؤسسة.',
      'family-9-area-2': 'إدارة التغيير، وتطوير التنظيم والثقافة، ومواءمة القيادة، لتترسخ طرق العمل الجديدة فعلًا.',
      'family-9-area-3': 'استراتيجية الابتكار والنمو، والتموضع في السوق، وتصميم رحلة العميل والخدمات.',
    },
  },
};

export const VOICE_TOUR_LANGUAGES = Object.keys(WORDS);

/** FNV-1a, 32-bit: a short fingerprint of a stop's text. */
export function textHash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const sentence = (text) => (/[.!?؟。]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

/**
 * Stops in order: { id, target, title, text, hash }. target is the element id to bring into view,
 * 'top' for the top of the page, or null to stay where the visitor is.
 * `families` needs { id, name, tagline, count, areas: [{ id, name }] } in the narrated language.
 */
export function buildVoiceTour(lang, families) {
  const w = WORDS[lang] || WORDS.en;
  const offerings = families.reduce((n, f) => n + f.count, 0);
  const stops = [
    { id: 'intro', target: 'top', title: w.introTitle, text: w.intro({ families: families.length, offerings }) },
    ...families.map((f) => ({
      id: f.id,
      target: f.id,
      title: f.name,
      text: [
        sentence(f.name),
        f.tagline && sentence(f.tagline),
        w.pitch[f.id],
        w.count({ count: f.count, areas: f.areas.length }),
        ...f.areas.map((a) => [sentence(a.name), w.areas[a.id]].filter(Boolean).join(' ')),
      ]
        .filter(Boolean)
        .join(' '),
    })),
    { id: 'outro', target: null, title: w.outroTitle, text: w.outro() },
  ];
  return stops.map((s) => ({ ...s, hash: textHash(s.text) }));
}
