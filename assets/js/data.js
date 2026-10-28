/* Sample data for the Masar prototype.
   Company names are real Saudi employers used for illustration only.
   Roles, skills and co-op details are sample data, not real openings. */

const MAJORS = [
  { id: 'software', en: 'Software Engineering', ar: 'هندسة البرمجيات', role: { en: 'Software Engineer', ar: 'مهندس برمجيات' } },
  { id: 'data', en: 'Data Science & AI', ar: 'علوم البيانات والذكاء الاصطناعي', role: { en: 'Data Scientist', ar: 'عالم بيانات' } },
  { id: 'cyber', en: 'Cybersecurity', ar: 'الأمن السيبراني', role: { en: 'Cybersecurity Analyst', ar: 'محلل أمن سيبراني' } },
  { id: 'petroleum', en: 'Petroleum Engineering', ar: 'هندسة البترول', role: { en: 'Petroleum Engineer', ar: 'مهندس بترول' } },
  { id: 'mechanical', en: 'Mechanical Engineering', ar: 'الهندسة الميكانيكية', role: { en: 'Mechanical Engineer', ar: 'مهندس ميكانيكي' } },
  { id: 'electrical', en: 'Electrical Engineering', ar: 'الهندسة الكهربائية', role: { en: 'Electrical Engineer', ar: 'مهندس كهربائي' } },
  { id: 'chemical', en: 'Chemical Engineering', ar: 'الهندسة الكيميائية', role: { en: 'Process Engineer', ar: 'مهندس عمليات' } },
  { id: 'finance', en: 'Accounting & Finance', ar: 'المحاسبة والمالية', role: { en: 'Financial Analyst', ar: 'محلل مالي' } },
  { id: 'marketing', en: 'Marketing', ar: 'التسويق', role: { en: 'Marketing Specialist', ar: 'أخصائي تسويق' } },
  { id: 'hr', en: 'Human Resources', ar: 'الموارد البشرية', role: { en: 'HR Specialist', ar: 'أخصائي موارد بشرية' } },
  { id: 'supply', en: 'Supply Chain & Logistics', ar: 'سلاسل الإمداد', role: { en: 'Supply Chain Analyst', ar: 'محلل سلاسل إمداد' } },
  { id: 'architecture', en: 'Architecture & Urban Design', ar: 'العمارة والتصميم الحضري', role: { en: 'Architect', ar: 'مهندس معماري' } }
];

/* type: 'tech' goes in Skills, 'soft' goes in Abilities */
const SKILLS = [
  { id: 'python', type: 'tech', en: 'Python', ar: 'بايثون', aliases: ['py'] },
  { id: 'sql', type: 'tech', en: 'SQL', ar: 'SQL', aliases: ['mysql', 'postgresql', 'databases', 'قواعد البيانات'] },
  { id: 'javascript', type: 'tech', en: 'JavaScript', ar: 'جافاسكربت', aliases: ['js', 'typescript', 'react', 'node'] },
  { id: 'java', type: 'tech', en: 'Java', ar: 'جافا', aliases: ['spring'] },
  { id: 'cloud', type: 'tech', en: 'Cloud Computing', ar: 'الحوسبة السحابية', aliases: ['aws', 'azure', 'gcp', 'cloud'] },
  { id: 'ml', type: 'tech', en: 'Machine Learning', ar: 'تعلم الآلة', aliases: ['ai', 'deep learning', 'الذكاء الاصطناعي'] },
  { id: 'dataanalysis', type: 'tech', en: 'Data Analysis', ar: 'تحليل البيانات', aliases: ['analytics', 'data analytics'] },
  { id: 'powerbi', type: 'tech', en: 'Power BI', ar: 'باور بي آي', aliases: ['tableau', 'dashboards'] },
  { id: 'excel', type: 'tech', en: 'Microsoft Excel', ar: 'إكسل', aliases: ['excel', 'spreadsheets'] },
  { id: 'netsec', type: 'tech', en: 'Network Security', ar: 'أمن الشبكات', aliases: ['security', 'firewalls', 'soc'] },
  { id: 'pentest', type: 'tech', en: 'Penetration Testing', ar: 'اختبار الاختراق', aliases: ['ethical hacking', 'pentesting'] },
  { id: 'autocad', type: 'tech', en: 'AutoCAD', ar: 'أوتوكاد', aliases: ['cad'] },
  { id: 'matlab', type: 'tech', en: 'MATLAB', ar: 'ماتلاب', aliases: [] },
  { id: 'reservoir', type: 'tech', en: 'Reservoir Engineering', ar: 'هندسة المكامن', aliases: ['reservoir'] },
  { id: 'drilling', type: 'tech', en: 'Drilling Engineering', ar: 'هندسة الحفر', aliases: ['drilling'] },
  { id: 'plc', type: 'tech', en: 'PLC & Automation', ar: 'الأتمتة والمتحكمات', aliases: ['plc', 'scada', 'automation'] },
  { id: 'powersys', type: 'tech', en: 'Power Systems', ar: 'أنظمة القوى الكهربائية', aliases: ['power systems', 'renewable energy', 'الطاقة المتجددة'] },
  { id: 'processdesign', type: 'tech', en: 'Process Design', ar: 'تصميم العمليات', aliases: ['aspen', 'hysys', 'process engineering'] },
  { id: 'hse', type: 'tech', en: 'Health, Safety & Environment', ar: 'الصحة والسلامة والبيئة', aliases: ['hse', 'safety', 'السلامة'] },
  { id: 'ifrs', type: 'tech', en: 'IFRS Reporting', ar: 'معايير IFRS', aliases: ['ifrs', 'accounting', 'المحاسبة'] },
  { id: 'finmodel', type: 'tech', en: 'Financial Modeling', ar: 'النمذجة المالية', aliases: ['financial analysis', 'valuation', 'التحليل المالي'] },
  { id: 'digitalmkt', type: 'tech', en: 'Digital Marketing', ar: 'التسويق الرقمي', aliases: ['social media', 'seo', 'google ads'] },
  { id: 'branding', type: 'tech', en: 'Brand Strategy', ar: 'استراتيجية العلامة التجارية', aliases: ['branding'] },
  { id: 'recruitment', type: 'tech', en: 'Talent Acquisition', ar: 'استقطاب المواهب', aliases: ['recruiting', 'recruitment', 'التوظيف'] },
  { id: 'sap', type: 'tech', en: 'SAP', ar: 'ساب', aliases: ['erp'] },
  { id: 'procurement', type: 'tech', en: 'Procurement', ar: 'المشتريات', aliases: ['purchasing', 'sourcing'] },
  { id: 'bim', type: 'tech', en: 'BIM (Revit)', ar: 'نمذجة معلومات البناء', aliases: ['bim', 'revit'] },
  { id: 'urban', type: 'tech', en: 'Urban Planning', ar: 'التخطيط العمراني', aliases: ['urban design', 'التخطيط الحضري'] },
  { id: 'pm', type: 'soft', en: 'Project Management', ar: 'إدارة المشاريع', aliases: ['pmp', 'project management'] },
  { id: 'agile', type: 'soft', en: 'Agile & Scrum', ar: 'منهجية أجايل', aliases: ['agile', 'scrum'] },
  { id: 'communication', type: 'soft', en: 'Communication', ar: 'التواصل', aliases: ['presentation', 'العرض والتقديم'] },
  { id: 'teamwork', type: 'soft', en: 'Teamwork', ar: 'العمل الجماعي', aliases: ['collaboration', 'التعاون'] },
  { id: 'leadership', type: 'soft', en: 'Leadership', ar: 'القيادة', aliases: ['team lead'] },
  { id: 'problemsolving', type: 'soft', en: 'Problem Solving', ar: 'حل المشكلات', aliases: ['critical thinking', 'التفكير النقدي'] },
  { id: 'english', type: 'soft', en: 'Business English', ar: 'اللغة الإنجليزية', aliases: ['english', 'ielts', 'toefl', 'الإنجليزية'] },
  { id: 'customerservice', type: 'soft', en: 'Customer Service', ar: 'خدمة العملاء', aliases: ['customer experience'] }
];

/* skills: [skillId, weight]  3 = high demand, 2 = in demand, 1 = valued */
const COMPANIES = [
  {
    id: 'aramco', mark: 'AR', color: '#0e6f5c', en: 'Saudi Aramco', ar: 'أرامكو السعودية',
    sector: { en: 'Energy', ar: 'الطاقة' }, city: { en: 'Dhahran', ar: 'الظهران' },
    about: { en: 'Integrated energy and chemicals company with operations across the Kingdom.', ar: 'شركة متكاملة للطاقة والكيميائيات بعمليات في أنحاء المملكة.' },
    majors: ['petroleum', 'chemical', 'mechanical', 'electrical', 'data', 'cyber', 'software'],
    skills: [['reservoir', 3], ['drilling', 3], ['hse', 3], ['python', 2], ['dataanalysis', 2], ['processdesign', 2], ['pm', 2], ['teamwork', 2], ['english', 2], ['problemsolving', 2], ['matlab', 1]],
    coop: { weeks: 28, season: { en: 'Year-round', ar: 'طوال العام' } }
  },
  {
    id: 'sabic', mark: 'SB', color: '#1d4f91', en: 'SABIC', ar: 'سابك',
    sector: { en: 'Petrochemicals', ar: 'البتروكيماويات' }, city: { en: 'Riyadh', ar: 'الرياض' },
    about: { en: 'Global leader in diversified chemicals and materials.', ar: 'شركة رائدة عالمياً في الكيماويات والمواد المتنوعة.' },
    majors: ['chemical', 'mechanical', 'data', 'supply', 'finance'],
    skills: [['processdesign', 3], ['hse', 3], ['dataanalysis', 2], ['sap', 2], ['matlab', 2], ['problemsolving', 2], ['english', 2], ['pm', 1]],
    coop: { weeks: 24, season: { en: 'Spring & Fall', ar: 'الربيع والخريف' } }
  },
  {
    id: 'stc', mark: 'ST', color: '#4f2d7f', en: 'stc', ar: 'إس تي سي',
    sector: { en: 'Telecom & Digital', ar: 'الاتصالات والتقنية' }, city: { en: 'Riyadh', ar: 'الرياض' },
    about: { en: 'Digital enabler providing telecom, cloud and cybersecurity services.', ar: 'ممكّن رقمي يقدم خدمات الاتصالات والسحابة والأمن السيبراني.' },
    majors: ['software', 'data', 'cyber', 'marketing'],
    skills: [['cloud', 3], ['netsec', 3], ['javascript', 2], ['java', 2], ['python', 2], ['ml', 2], ['agile', 2], ['customerservice', 2], ['communication', 2], ['digitalmkt', 1]],
    coop: { weeks: 24, season: { en: 'Year-round', ar: 'طوال العام' } }
  },
  {
    id: 'alrajhi', mark: 'RJ', color: '#1f3f8a', en: 'Al Rajhi Bank', ar: 'مصرف الراجحي',
    sector: { en: 'Banking', ar: 'المصارف' }, city: { en: 'Riyadh', ar: 'الرياض' },
    about: { en: 'One of the largest Islamic banks in the world.', ar: 'من أكبر المصارف الإسلامية في العالم.' },
    majors: ['finance', 'cyber', 'software', 'data', 'marketing'],
    skills: [['ifrs', 3], ['finmodel', 3], ['excel', 2], ['sql', 2], ['netsec', 2], ['powerbi', 2], ['customerservice', 2], ['communication', 2]],
    coop: { weeks: 16, season: { en: 'Summer', ar: 'الصيف' } }
  },
  {
    id: 'neom', mark: 'NE', color: '#3b3b44', en: 'NEOM', ar: 'نيوم',
    sector: { en: 'Giga-project', ar: 'المشاريع الكبرى' }, city: { en: 'Tabuk', ar: 'تبوك' },
    about: { en: 'A new region in northwest Saudi Arabia built around sustainability and technology.', ar: 'منطقة جديدة في شمال غرب المملكة قائمة على الاستدامة والتقنية.' },
    majors: ['architecture', 'software', 'data', 'electrical', 'supply'],
    skills: [['bim', 3], ['urban', 3], ['pm', 3], ['ml', 2], ['python', 2], ['powersys', 2], ['autocad', 2], ['english', 2], ['leadership', 2]],
    coop: { weeks: 24, season: { en: 'Year-round', ar: 'طوال العام' } }
  },
  {
    id: 'snb', mark: 'SN', color: '#146356', en: 'Saudi National Bank', ar: 'البنك الأهلي السعودي',
    sector: { en: 'Banking', ar: 'المصارف' }, city: { en: 'Riyadh', ar: 'الرياض' },
    about: { en: 'The largest bank in Saudi Arabia by assets.', ar: 'أكبر بنك في المملكة من حيث الأصول.' },
    majors: ['finance', 'data', 'cyber', 'hr'],
    skills: [['ifrs', 3], ['finmodel', 3], ['excel', 3], ['sql', 2], ['powerbi', 2], ['pentest', 2], ['communication', 2], ['recruitment', 1]],
    coop: { weeks: 16, season: { en: 'Summer', ar: 'الصيف' } }
  },
  {
    id: 'maaden', mark: 'MA', color: '#8a5a1f', en: "Ma'aden", ar: 'معادن',
    sector: { en: 'Mining', ar: 'التعدين' }, city: { en: 'Riyadh', ar: 'الرياض' },
    about: { en: 'Mining and metals company developing the Kingdom’s mineral resources.', ar: 'شركة تعدين ومعادن تطور الثروات المعدنية في المملكة.' },
    majors: ['mechanical', 'chemical', 'electrical', 'supply'],
    skills: [['hse', 3], ['processdesign', 2], ['autocad', 2], ['plc', 2], ['procurement', 2], ['sap', 2], ['teamwork', 2], ['pm', 2]],
    coop: { weeks: 24, season: { en: 'Spring & Fall', ar: 'الربيع والخريف' } }
  },
  {
    id: 'sec', mark: 'SE', color: '#1c5d99', en: 'Saudi Electricity', ar: 'السعودية للكهرباء',
    sector: { en: 'Utilities', ar: 'المرافق' }, city: { en: 'Riyadh', ar: 'الرياض' },
    about: { en: 'Generates, transmits and distributes electricity across the Kingdom.', ar: 'تولّد الكهرباء وتنقلها وتوزعها في أنحاء المملكة.' },
    majors: ['electrical', 'mechanical', 'data', 'cyber'],
    skills: [['powersys', 3], ['plc', 3], ['hse', 2], ['matlab', 2], ['autocad', 2], ['dataanalysis', 2], ['netsec', 2], ['problemsolving', 2]],
    coop: { weeks: 24, season: { en: 'Year-round', ar: 'طوال العام' } }
  },
  {
    id: 'elm', mark: 'EL', color: '#0d5c63', en: 'Elm', ar: 'علم',
    sector: { en: 'Technology', ar: 'التقنية' }, city: { en: 'Riyadh', ar: 'الرياض' },
    about: { en: 'Digital solutions provider for government and private sectors.', ar: 'مزود حلول رقمية للقطاعين الحكومي والخاص.' },
    majors: ['software', 'data', 'cyber', 'hr'],
    skills: [['javascript', 3], ['java', 3], ['agile', 3], ['python', 2], ['cloud', 2], ['ml', 2], ['pentest', 2], ['sql', 2], ['problemsolving', 2]],
    coop: { weeks: 24, season: { en: 'Year-round', ar: 'طوال العام' } }
  },
  {
    id: 'saudia', mark: 'SV', color: '#2a6a4a', en: 'Saudia', ar: 'الخطوط السعودية',
    sector: { en: 'Aviation', ar: 'الطيران' }, city: { en: 'Jeddah', ar: 'جدة' },
    about: { en: 'The national flag carrier of Saudi Arabia.', ar: 'الناقل الجوي الوطني للمملكة العربية السعودية.' },
    majors: ['mechanical', 'marketing', 'supply', 'hr', 'finance'],
    skills: [['customerservice', 3], ['english', 3], ['communication', 3], ['digitalmkt', 2], ['procurement', 2], ['recruitment', 2], ['excel', 2], ['teamwork', 2]],
    coop: null
  },
  {
    id: 'almarai', mark: 'AM', color: '#2457a6', en: 'Almarai', ar: 'المراعي',
    sector: { en: 'Food & Beverage', ar: 'الأغذية والمشروبات' }, city: { en: 'Riyadh', ar: 'الرياض' },
    about: { en: 'Large vertically integrated food and beverage manufacturer.', ar: 'شركة كبرى متكاملة لتصنيع الأغذية والمشروبات.' },
    majors: ['supply', 'marketing', 'finance', 'chemical'],
    skills: [['sap', 3], ['procurement', 3], ['branding', 2], ['digitalmkt', 2], ['excel', 2], ['finmodel', 2], ['hse', 2], ['leadership', 2]],
    coop: { weeks: 12, season: { en: 'Summer', ar: 'الصيف' } }
  },
  {
    id: 'acwa', mark: 'AC', color: '#0b6e8a', en: 'ACWA Power', ar: 'أكوا باور',
    sector: { en: 'Renewable Energy', ar: 'الطاقة المتجددة' }, city: { en: 'Riyadh', ar: 'الرياض' },
    about: { en: 'Developer and operator of power generation and water desalination plants.', ar: 'مطور ومشغل لمحطات توليد الكهرباء وتحلية المياه.' },
    majors: ['electrical', 'mechanical', 'chemical', 'finance'],
    skills: [['powersys', 3], ['hse', 3], ['pm', 3], ['processdesign', 2], ['finmodel', 2], ['english', 2], ['matlab', 1]],
    coop: { weeks: 24, season: { en: 'Spring & Fall', ar: 'الربيع والخريف' } }
  },
  {
    id: 'redsea', mark: 'RS', color: '#9b4a2c', en: 'Red Sea Global', ar: 'البحر الأحمر الدولية',
    sector: { en: 'Tourism & Development', ar: 'السياحة والتطوير' }, city: { en: 'Riyadh', ar: 'الرياض' },
    about: { en: 'Developer of regenerative tourism destinations on the Red Sea coast.', ar: 'مطور لوجهات سياحية مستدامة على ساحل البحر الأحمر.' },
    majors: ['architecture', 'marketing', 'hr', 'supply'],
    skills: [['urban', 3], ['branding', 3], ['bim', 2], ['digitalmkt', 2], ['customerservice', 2], ['recruitment', 2], ['pm', 2], ['english', 2]],
    coop: null
  },
  {
    id: 'riyad', mark: 'RY', color: '#1d3c78', en: 'Riyad Bank', ar: 'بنك الرياض',
    sector: { en: 'Banking', ar: 'المصارف' }, city: { en: 'Riyadh', ar: 'الرياض' },
    about: { en: 'Leading Saudi bank with a growing digital banking arm.', ar: 'بنك سعودي رائد بذراع متنامية للخدمات المصرفية الرقمية.' },
    majors: ['finance', 'data', 'software', 'marketing'],
    skills: [['finmodel', 3], ['powerbi', 3], ['ifrs', 2], ['sql', 2], ['python', 2], ['excel', 2], ['agile', 2], ['communication', 2], ['digitalmkt', 1]],
    coop: { weeks: 16, season: { en: 'Summer', ar: 'الصيف' } }
  }
];

const NOTIFICATIONS = [
  { id: 'n1', en: 'Elm opened 6 new Software Engineering roles.', ar: 'فتحت شركة علم 6 وظائف جديدة في هندسة البرمجيات.', time: { en: '2h ago', ar: 'قبل ساعتين' } },
  { id: 'n2', en: 'Co-op applications at Saudi Aramco close in 10 days.', ar: 'يغلق التقديم على التدريب التعاوني في أرامكو خلال 10 أيام.', time: { en: 'Yesterday', ar: 'أمس' } },
  { id: 'n3', en: 'Tip: add Power BI to match more finance roles.', ar: 'نصيحة: أضف Power BI لتطابق وظائف مالية أكثر.', time: { en: '3d ago', ar: 'قبل 3 أيام' } }
];

/* Question format: [question_en, question_ar, options_en, options_ar|null, correctIndex]
   options_ar = null means the options read the same in both languages. */
const QUESTIONS = {
  python: [
    ['What does len([1, 2, 3]) return?', 'ما ناتج len([1, 2, 3])؟', ['2', '3', '6', 'Error'], null, 1],
    ['Which keyword defines a function in Python?', 'ما الكلمة المفتاحية لتعريف دالة في بايثون؟', ['func', 'function', 'def', 'lambda only'], null, 2],
    ['Which type is immutable?', 'أي نوع من الأنواع التالية غير قابل للتعديل؟', ['list', 'dict', 'set', 'tuple'], null, 3]
  ],
  sql: [
    ['Which clause filters rows after GROUP BY?', 'أي عبارة تُرشّح الصفوف بعد GROUP BY؟', ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], null, 1],
    ['Which JOIN returns only matching rows from both tables?', 'أي نوع JOIN يعيد الصفوف المتطابقة فقط من الجدولين؟', ['LEFT JOIN', 'FULL JOIN', 'INNER JOIN', 'CROSS JOIN'], null, 2],
    ['What does COUNT(*) count?', 'ماذا تحسب COUNT(*)؟', ['Non-null values', 'All rows', 'Distinct rows', 'Columns'], ['القيم غير الفارغة', 'كل الصفوف', 'الصفوف المميزة', 'الأعمدة'], 1]
  ],
  javascript: [
    ['What is the result of typeof null?', 'ما ناتج typeof null؟', ['"null"', '"undefined"', '"object"', '"number"'], null, 2],
    ['Which declaration cannot be reassigned?', 'أي تصريح لا يمكن إعادة إسناده؟', ['var', 'let', 'const', 'function'], null, 2],
    ['What does [1, 2, 3].map(x => x * 2) return?', 'ما ناتج [1, 2, 3].map(x => x * 2)؟', ['[2, 4, 6]', '[1, 2, 3]', '12', 'undefined'], null, 0]
  ],
  java: [
    ['Which keyword creates a subclass?', 'ما الكلمة المفتاحية لإنشاء صنف فرعي؟', ['implements', 'extends', 'inherits', 'super'], null, 1],
    ['Which collection keeps keys unique?', 'أي مجموعة تحافظ على تفرد المفاتيح؟', ['ArrayList', 'LinkedList', 'HashMap', 'Array'], null, 2],
    ['What is the entry point of a Java program?', 'ما نقطة بداية برنامج جافا؟', ['start()', 'main()', 'run()', 'init()'], null, 1]
  ],
  cloud: [
    ['What does "IaaS" stand for?', 'ماذا يعني الاختصار IaaS؟', ['Internet as a Service', 'Infrastructure as a Service', 'Integration as a Service', 'Identity as a Service'], ['الإنترنت كخدمة', 'البنية التحتية كخدمة', 'التكامل كخدمة', 'الهوية كخدمة'], 1],
    ['Auto-scaling mainly helps with…', 'التوسع التلقائي يساعد أساساً في…', ['Handling changing load', 'Encrypting data', 'Writing code', 'Naming servers'], ['التعامل مع تغير الأحمال', 'تشفير البيانات', 'كتابة الشيفرة', 'تسمية الخوادم'], 0],
    ['Object storage (like S3) is best for…', 'التخزين الكائني (مثل S3) أنسب لـ…', ['Files and backups', 'CPU processing', 'Network routing', 'User passwords in plain text'], ['الملفات والنسخ الاحتياطية', 'المعالجة المركزية', 'توجيه الشبكة', 'كلمات المرور كنص صريح'], 0]
  ],
  ml: [
    ['Training on labeled data is called…', 'التدريب على بيانات موسومة يسمى…', ['Unsupervised learning', 'Supervised learning', 'Reinforcement learning', 'Clustering'], ['التعلم غير الموجّه', 'التعلم الموجّه', 'التعلم المعزز', 'التجميع'], 1],
    ['A model great on training data but poor on new data is…', 'نموذج ممتاز على بيانات التدريب وضعيف على البيانات الجديدة يعاني من…', ['Underfitting', 'Overfitting', 'Normalization', 'Regularization'], ['نقص الملاءمة', 'فرط الملاءمة', 'التطبيع', 'التنظيم'], 1],
    ['Which metric suits imbalanced classification?', 'أي مقياس يناسب التصنيف غير المتوازن؟', ['Accuracy only', 'F1 score', 'Mean squared error', 'R²'], ['الدقة فقط', 'مقياس F1', 'متوسط مربع الخطأ', 'R²'], 1]
  ],
  dataanalysis: [
    ['Which measure is least affected by outliers?', 'أي مقياس أقل تأثراً بالقيم الشاذة؟', ['Mean', 'Median', 'Range', 'Sum'], ['المتوسط', 'الوسيط', 'المدى', 'المجموع'], 1],
    ['Which chart best shows a trend over time?', 'أي رسم بياني يُظهر الاتجاه عبر الزمن بشكل أفضل؟', ['Pie chart', 'Line chart', 'Scatter of names', 'Word cloud'], ['دائري', 'خطي', 'نقاط للأسماء', 'سحابة كلمات'], 1],
    ['Correlation of −0.9 means…', 'معامل ارتباط −0.9 يعني…', ['No relationship', 'Strong negative relationship', 'Weak positive relationship', 'Causation'], ['لا توجد علاقة', 'علاقة عكسية قوية', 'علاقة طردية ضعيفة', 'علاقة سببية'], 1]
  ],
  powerbi: [
    ['DAX in Power BI is used to…', 'تُستخدم لغة DAX في Power BI لـ…', ['Write calculations and measures', 'Draw shapes', 'Send emails', 'Host websites'], ['كتابة الحسابات والمقاييس', 'رسم الأشكال', 'إرسال البريد', 'استضافة المواقع'], 0],
    ['Power Query is mainly for…', 'يُستخدم Power Query أساساً لـ…', ['Cleaning and shaping data', 'Publishing videos', 'Version control', 'Writing reports in Word'], ['تنظيف البيانات وتشكيلها', 'نشر الفيديو', 'إدارة الإصدارات', 'كتابة التقارير في وورد'], 0]
  ],
  excel: [
    ['Which function looks up a value in a table?', 'أي دالة تبحث عن قيمة في جدول؟', ['SUM', 'XLOOKUP', 'LEN', 'TODAY'], null, 1],
    ['What does $A$1 mean in a formula?', 'ماذا يعني $A$1 في الصيغة؟', ['Relative reference', 'Absolute reference', 'Currency format', 'Error'], ['مرجع نسبي', 'مرجع مطلق', 'تنسيق عملة', 'خطأ'], 1],
    ['A PivotTable is used to…', 'يُستخدم الجدول المحوري لـ…', ['Summarize data', 'Protect a sheet', 'Insert images', 'Spell check'], ['تلخيص البيانات', 'حماية الورقة', 'إدراج الصور', 'التدقيق الإملائي'], 0]
  ],
  netsec: [
    ['A firewall primarily…', 'الجدار الناري بشكل أساسي…', ['Filters network traffic', 'Speeds up Wi-Fi', 'Stores passwords', 'Backs up files'], ['يرشّح حركة الشبكة', 'يسرّع الواي فاي', 'يخزن كلمات المرور', 'ينسخ الملفات'], 0],
    ['Which protocol encrypts web traffic?', 'أي بروتوكول يشفّر حركة الويب؟', ['HTTP', 'FTP', 'HTTPS', 'Telnet'], null, 2],
    ['Phishing is an attack that…', 'التصيّد الاحتيالي هجوم…', ['Tricks people into giving information', 'Overheats servers', 'Breaks cables', 'Slows DNS'], ['يخدع الأشخاص لكشف المعلومات', 'يرفع حرارة الخوادم', 'يقطع الكابلات', 'يبطئ DNS'], 0]
  ],
  pentest: [
    ['What is the first phase of a penetration test?', 'ما المرحلة الأولى في اختبار الاختراق؟', ['Exploitation', 'Reconnaissance', 'Reporting', 'Cleanup'], ['الاستغلال', 'الاستطلاع', 'إعداد التقرير', 'التنظيف'], 1],
    ['SQL injection targets…', 'يستهدف حقن SQL…', ['Unvalidated input to databases', 'Printer drivers', 'CPU cache', 'Email fonts'], ['المدخلات غير المتحقق منها لقواعد البيانات', 'تعريفات الطابعة', 'ذاكرة المعالج', 'خطوط البريد'], 0]
  ],
  hse: [
    ['What is the purpose of a permit-to-work system?', 'ما الغرض من نظام تصاريح العمل؟', ['Control high-risk jobs safely', 'Track salaries', 'Book meeting rooms', 'Order supplies'], ['التحكم الآمن في الأعمال عالية الخطورة', 'متابعة الرواتب', 'حجز القاعات', 'طلب المستلزمات'], 0],
    ['In the hierarchy of controls, the most effective is…', 'في تسلسل الضوابط، الأكثر فاعلية هو…', ['PPE', 'Elimination', 'Warning signs', 'Training'], ['معدات الوقاية الشخصية', 'إزالة الخطر', 'اللافتات التحذيرية', 'التدريب'], 1],
    ['A "near miss" is…', 'الحادث الوشيك هو…', ['An event that could have caused harm but did not', 'A completed task', 'A late delivery', 'A fire drill'], ['حدث كاد يسبب ضرراً لكنه لم يحدث', 'مهمة مكتملة', 'تسليم متأخر', 'تمرين إخلاء'], 0]
  ],
  ifrs: [
    ['Which statement shows assets, liabilities and equity?', 'أي قائمة تعرض الأصول والخصوم وحقوق الملكية؟', ['Income statement', 'Balance sheet', 'Cash flow statement', 'Budget'], ['قائمة الدخل', 'الميزانية العمومية', 'قائمة التدفقات النقدية', 'الموازنة'], 1],
    ['Revenue is recognized under IFRS 15 when…', 'يُعترف بالإيراد وفق IFRS 15 عندما…', ['Cash is received', 'Performance obligations are satisfied', 'The invoice is printed', 'The year ends'], ['يُستلم النقد', 'تُستوفى التزامات الأداء', 'تُطبع الفاتورة', 'تنتهي السنة'], 1],
    ['Depreciation spreads the cost of…', 'الإهلاك يوزّع تكلفة…', ['Fixed assets over their useful life', 'Salaries over a year', 'Taxes over a quarter', 'Inventory sold'], ['الأصول الثابتة على عمرها الإنتاجي', 'الرواتب على سنة', 'الضرائب على ربع سنة', 'المخزون المباع'], 0]
  ],
  finmodel: [
    ['NPV above zero suggests the project…', 'صافي القيمة الحالية الأكبر من صفر يعني أن المشروع…', ['Destroys value', 'Adds value', 'Has no cash flows', 'Is risk free'], ['يدمر القيمة', 'يضيف قيمة', 'بلا تدفقات نقدية', 'بلا مخاطر'], 1],
    ['WACC is used as…', 'يُستخدم متوسط تكلفة رأس المال المرجح كـ…', ['A discount rate', 'A tax rate', 'An inflation index', 'A sales target'], ['معدل خصم', 'معدل ضريبة', 'مؤشر تضخم', 'هدف مبيعات'], 0]
  ],
  digitalmkt: [
    ['CTR stands for…', 'الاختصار CTR يعني…', ['Click-through rate', 'Cost to revenue', 'Customer tracking ratio', 'Content type rule'], ['نسبة النقر إلى الظهور', 'التكلفة إلى الإيراد', 'نسبة تتبع العملاء', 'قاعدة نوع المحتوى'], 0],
    ['Which is an owned media channel?', 'أي مما يلي قناة إعلامية مملوكة؟', ['Company website', 'Paid search ad', 'News article about you', 'Billboard rental'], ['موقع الشركة', 'إعلان بحث مدفوع', 'مقال إخباري عنك', 'لوحة إعلانية مستأجرة'], 0],
    ['A/B testing compares…', 'اختبار A/B يقارن…', ['Two versions to see which performs better', 'Two companies', 'Two budgets only', 'Two languages'], ['نسختين لمعرفة الأفضل أداءً', 'شركتين', 'ميزانيتين فقط', 'لغتين'], 0]
  ],
  autocad: [
    ['Which command creates a copy at a set distance from a line?', 'أي أمر ينشئ نسخة على مسافة محددة من خط؟', ['OFFSET', 'TRIM', 'ZOOM', 'LAYER'], null, 0],
    ['Layers in AutoCAD help you…', 'تساعدك الطبقات في أوتوكاد على…', ['Organize and control drawing objects', 'Render videos', 'Write scripts', 'Print faster'], ['تنظيم عناصر الرسم والتحكم بها', 'إخراج الفيديو', 'كتابة النصوص البرمجية', 'الطباعة أسرع'], 0]
  ],
  pm: [
    ['The critical path is…', 'المسار الحرج هو…', ['The longest sequence of dependent tasks', 'The cheapest tasks', 'The first task', 'The tasks with most people'], ['أطول تسلسل للمهام المعتمدة', 'أرخص المهام', 'المهمة الأولى', 'المهام ذات أكبر عدد من الأفراد'], 0],
    ['Scope creep means…', 'زحف النطاق يعني…', ['Uncontrolled growth in project scope', 'Finishing early', 'Reducing the budget', 'Hiring more staff'], ['توسع غير منضبط في نطاق المشروع', 'الانتهاء مبكراً', 'خفض الميزانية', 'توظيف المزيد'], 0],
    ['A stakeholder is…', 'صاحب المصلحة هو…', ['Anyone affected by or able to affect the project', 'Only the sponsor', 'Only the team', 'Only customers'], ['كل من يتأثر بالمشروع أو يؤثر فيه', 'الراعي فقط', 'الفريق فقط', 'العملاء فقط'], 0]
  ],
  agile: [
    ['A Scrum sprint is…', 'السبرنت في سكرم هو…', ['A fixed time-box to deliver work', 'An annual plan', 'A bug report', 'A type of server'], ['فترة زمنية محددة لإنجاز العمل', 'خطة سنوية', 'تقرير خطأ', 'نوع من الخوادم'], 0],
    ['Who owns the product backlog?', 'من يملك قائمة أعمال المنتج؟', ['Scrum Master', 'Product Owner', 'CEO', 'QA lead'], ['سكرم ماستر', 'مالك المنتج', 'الرئيس التنفيذي', 'قائد الجودة'], 1]
  ],
  communication: [
    ['Active listening includes…', 'الاستماع الفعّال يشمل…', ['Summarizing what you heard', 'Planning your reply while they talk', 'Checking your phone', 'Interrupting to save time'], ['تلخيص ما سمعته', 'التخطيط لردك أثناء حديثهم', 'تفقد هاتفك', 'المقاطعة لتوفير الوقت'], 0],
    ['For a senior audience, a report should open with…', 'عند الكتابة للإدارة العليا، يبدأ التقرير بـ…', ['The key conclusion', 'Raw data tables', 'Your job history', 'A long introduction'], ['الاستنتاج الرئيسي', 'جداول البيانات الخام', 'سيرتك المهنية', 'مقدمة طويلة'], 0]
  ],
  teamwork: [
    ['A teammate misses deadlines. The best first step is…', 'زميل يتأخر في المواعيد. أفضل خطوة أولى هي…', ['Talk to them privately', 'Complain to the manager', 'Do their work silently', 'Ignore it'], ['التحدث معه على انفراد', 'الشكوى للمدير', 'إنجاز عمله بصمت', 'التجاهل'], 0],
    ['Healthy team conflict should focus on…', 'الخلاف الصحي في الفريق يركز على…', ['Ideas and solutions', 'Personalities', 'Winning', 'Blame'], ['الأفكار والحلول', 'الشخصيات', 'الفوز', 'اللوم'], 0]
  ],
  leadership: [
    ['Delegating well means…', 'التفويض الجيد يعني…', ['Matching tasks to people and giving clear outcomes', 'Giving away work you dislike', 'Doing everything yourself', 'Avoiding follow-up'], ['مطابقة المهام للأشخاص مع نتائج واضحة', 'التخلص من المهام غير المحببة', 'إنجاز كل شيء بنفسك', 'تجنب المتابعة'], 0],
    ['Effective feedback is…', 'التغذية الراجعة الفعالة…', ['Specific and timely', 'Vague and yearly', 'Only negative', 'Public criticism'], ['محددة وفي وقتها', 'عامة وسنوية', 'سلبية فقط', 'انتقاد علني'], 0]
  ],
  problemsolving: [
    ['If 5 machines make 5 parts in 5 minutes, how long do 100 machines take to make 100 parts?', 'إذا صنعت 5 آلات 5 قطع في 5 دقائق، كم تحتاج 100 آلة لصنع 100 قطعة؟', ['100 minutes', '20 minutes', '5 minutes', '1 minute'], ['100 دقيقة', '20 دقيقة', '5 دقائق', 'دقيقة واحدة'], 2],
    ['"5 Whys" is a technique to find…', 'أسلوب "لماذا الخمس" يُستخدم لإيجاد…', ['The root cause', 'A budget', 'A new hire', 'A slogan'], ['السبب الجذري', 'الميزانية', 'موظف جديد', 'شعار'], 0],
    ['Next in the series 2, 6, 12, 20, …?', 'ما الرقم التالي في المتسلسلة 2، 6، 12، 20، …؟', ['28', '30', '32', '24'], null, 1]
  ],
  english: [
    ['Choose the correct sentence.', 'اختر الجملة الصحيحة.', ['She have finished the report.', 'She has finished the report.', 'She finish the report yesterday.', 'She finishing the report.'], null, 1],
    ['"Could you please send the file by EOD?" EOD means…', 'في عبارة "send the file by EOD" تعني EOD…', ['End of day', 'Every other day', 'End of deal', 'Early on delivery'], ['نهاية يوم العمل', 'كل يومين', 'نهاية الصفقة', 'تسليم مبكر'], 0]
  ],
  customerservice: [
    ['An angry customer calls. You should first…', 'عميل غاضب يتصل. يجب أولاً…', ['Listen and acknowledge the issue', 'Transfer them right away', 'Quote the policy', 'End the call'], ['الاستماع والإقرار بالمشكلة', 'تحويله فوراً', 'ذكر السياسة', 'إنهاء المكالمة'], 0],
    ['First contact resolution measures…', 'مقياس الحل من أول تواصل يقيس…', ['Issues solved in the first interaction', 'Calls per hour', 'Number of agents', 'Average salary'], ['المشكلات المحلولة من أول تواصل', 'المكالمات في الساعة', 'عدد الموظفين', 'متوسط الراتب'], 0]
  ]
};
