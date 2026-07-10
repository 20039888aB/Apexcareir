export const doctor = {
  name: 'Dr Alice Adhiambo',
  shortName: 'Dr Alice',
  title: 'Interventional Radiologist',
  location: 'Nairobi, Kenya',
  phones: ['0716 521 406', '0745 902 757'],
  phonesRaw: ['0716521406', '0745902757'],
  whatsapp: '254716521406',
  email: 'info@draliceadhiambo.co.ke',
  clinic: 'Apexcareir',
  hospital: 'Nairobi',
  address: 'Nairobi, Kenya',
  coverage: 'Nationwide across Kenya',
  tagline: 'Precision. Innovation. Compassion.',
  acceptingPatients: true,
};

export const credentials = [
  { label: 'MBChB', detail: 'Bachelor of Medicine and Bachelor of Surgery' },
  { label: 'MMed Radiology', detail: 'Master of Medicine in Diagnostic Radiology — Moi University' },
  { label: 'Fellowship in IR', detail: 'Sub-specialist training in Interventional Radiology — University of Nairobi' },
  { label: 'Consultant', detail: 'Registered with the Kenya Medical Practitioners & Dentists Council' },
];

export const stats = [
  { value: '10+', label: 'Years in Radiology' },
  { value: '90%+', label: 'Diagnostic Accuracy' },
  { value: 'Same Day', label: 'Most Discharges' },
];

export type Service = {
  slug: string;
  title: string;
  shortTitle: string;
  icon: string;
  description: string;
  indications: string[];
  duration: string;
  anaesthesia: string;
  monitoring: string;
  discharge: string;
};

export const services: Service[] = [
  {
    slug: 'ultrasound-guided-biopsy',
    title: 'Ultrasound Guided Biopsy',
    shortTitle: 'Ultrasound Biopsy',
    icon: 'scan',
    description: 'Radiation-free, real-time imaging for precise tissue sampling of superficial and accessible lesions.',
    indications: ['Thyroid nodules', 'Breast lumps', 'Superficial lymph nodes', 'Liver lesions', 'Soft tissue masses'],
    duration: '15–30 minutes',
    anaesthesia: 'Local anaesthesia',
    monitoring: '30 minutes–1 hour',
    discharge: 'Same day',
  },
  {
    slug: 'liver-biopsy',
    title: 'Liver Biopsy',
    shortTitle: 'Liver Biopsy',
    icon: 'liver',
    description: 'CT or ultrasound guided liver tissue sampling for accurate diagnosis of liver disease, hepatitis, cirrhosis, and tumours.',
    indications: ['Suspected liver cirrhosis or fibrosis', 'Focal liver lesions or tumours', 'Hepatitis staging and grading', 'Post-transplant liver monitoring', 'Suspected metastatic liver disease'],
    duration: '20–45 minutes',
    anaesthesia: 'Local anaesthesia',
    monitoring: '2–4 hours',
    discharge: 'Same day',
  },
  {
    slug: 'breast-biopsy',
    title: 'Breast Biopsy',
    shortTitle: 'Breast Biopsy',
    icon: 'heart',
    description: 'Minimally invasive ultrasound guided breast biopsy for suspicious lumps, masses, and abnormal imaging findings.',
    indications: ['Abnormal mammography or ultrasound', 'BIRADS 4 or 5 lesions', 'Breast pain with imaging abnormality', 'Follow-up of previously identified lesions', 'Pre-surgical tissue confirmation'],
    duration: '15–25 minutes',
    anaesthesia: 'Local anaesthesia',
    monitoring: '30 minutes–1 hour',
    discharge: 'Same day',
  },
  {
    slug: 'thyroid-biopsy',
    title: 'Thyroid Biopsy',
    shortTitle: 'Thyroid Biopsy',
    icon: 'activity',
    description: 'Ultrasound-guided FNA and core biopsy of thyroid nodules for accurate diagnosis of thyroid conditions.',
    indications: ['Growing thyroid nodules', 'Multinodular goitre with dominant nodule', 'Suspicious ultrasound features', 'Lymph nodes suspicious for metastasis', 'Previous inconclusive FNA'],
    duration: '10–20 minutes',
    anaesthesia: 'Local anaesthesia',
    monitoring: '30 minutes',
    discharge: 'Same day — immediate',
  },
  {
    slug: 'lung-biopsy',
    title: 'Lung Biopsy',
    shortTitle: 'Lung Biopsy',
    icon: 'wind',
    description: 'CT guided lung biopsy for diagnosis of lung nodules, masses, and suspected lung cancer.',
    indications: ['Lung nodules requiring diagnosis', 'Mediastinal masses and hilar lymph nodes', 'Pleural-based lesions', 'Tissue for molecular testing', 'Recurrent or metastatic disease'],
    duration: '30–60 minutes',
    anaesthesia: 'Local anaesthesia',
    monitoring: '2–4 hours',
    discharge: 'Same day if no complications',
  },
  {
    slug: 'lymph-node-biopsy',
    title: 'Lymph Node Biopsy',
    shortTitle: 'Lymph Node Biopsy',
    icon: 'nodes',
    description: 'CT and ultrasound guided lymph node biopsy for lymphoma, metastatic cancer, and infections.',
    indications: ['Suspected lymphoma', 'Metastatic cancer staging', 'Deep mediastinal lymphadenopathy', 'Suspected TB lymphadenitis', 'Persistent lymphadenopathy of unknown cause'],
    duration: '15–45 minutes',
    anaesthesia: 'Local anaesthesia',
    monitoring: '1–2 hours',
    discharge: 'Same day',
  },
];

export type IRServiceCategory = {
  slug: string;
  title: string;
  description: string;
  highlight: string;
  procedures: string[];
};

export const irServiceCategories: IRServiceCategory[] = [
  {
    slug: 'venous-access',
    title: 'Venous Access',
    description: 'Image-guided line and port placement, revision, and safe removal for reliable long-term access.',
    highlight: 'Placement, revision, and removal',
    procedures: [
      'Tunneled line placement',
      'Port placement',
      'Temporary line placement',
      'PICC reposition',
      'Tunneled line and port removal',
    ],
  },
  {
    slug: 'drains-and-tubes',
    title: 'Drains & Tubes',
    description: 'Percutaneous drain and tube placement with routine exchange and revision to maintain function and comfort.',
    highlight: 'Placement and exchange pathways',
    procedures: [
      'Drain and chest tube placement',
      'Tunneled pleural/peritoneal drains',
      'Gastrostomy and gastrojejunostomy tubes',
      'Nephrostomy and nephroureteral tubes',
      'Biliary drain and cholecystostomy management',
    ],
  },
  {
    slug: 'embolization',
    title: 'Embolization',
    description: 'Targeted vessel occlusion for bleeding control, fibroid and tumour therapy, and vascular malformation management.',
    highlight: 'Acute hemorrhage and tissue embolization',
    procedures: [
      'Trauma, GI, renal, and uterine hemorrhage embolization',
      'Uterine fibroid and prostate artery embolization',
      'Pre-op and renal tumour embolization',
      'Vascular malformation embolization/sclerotherapy',
      'Gonadal vein and pulmonary AVM embolization',
    ],
  },
  {
    slug: 'interventional-oncology',
    title: 'Interventional Oncology',
    description: 'Minimally invasive cancer therapies combining embolization and ablation for local tumour control.',
    highlight: 'Advanced liver and tumour-directed therapy',
    procedures: [
      'Y-90 radioembolization',
      'Transarterial chemoembolization (TACE)',
      'Transarterial embolization',
      'Thermal ablation and cryoablation',
      'Percutaneous ethanol injection and irreversible electroporation',
    ],
  },
  {
    slug: 'portal-interventions',
    title: 'Portal Interventions',
    description: 'Portal venous pressure and flow procedures for complications of liver disease and portal hypertension.',
    highlight: 'TIPS and portal vein restoration',
    procedures: [
      'TIPS placement and revision',
      'Retrograde transvenous obliteration',
      'Antegrade transvenous obliteration',
      'Portal vein recanalization',
      'Portal vein embolization',
    ],
  },
  {
    slug: 'dialysis-interventions',
    title: 'Dialysis Interventions',
    description: 'Fistula and graft salvage procedures to keep dialysis access functional and reduce treatment interruptions.',
    highlight: 'Access patency maintenance',
    procedures: [
      'Dialysis fistulagram/graftogram',
      'Fistula/graft declot',
      'Stenosis evaluation and targeted intervention',
    ],
  },
  {
    slug: 'arterial-interventions',
    title: 'Arterial Interventions',
    description: 'Diagnostic and therapeutic arterial procedures for transplant and limb circulation challenges.',
    highlight: 'Transplant and extremity arterial care',
    procedures: [
      'Transplant hepatic arterial intervention',
      'Transplant renal arterial intervention',
      'Lower extremity arterial intervention',
      'Upper extremity arterial intervention',
    ],
  },
  {
    slug: 'venous-interventions',
    title: 'Venous Interventions',
    description: 'Comprehensive venous therapies from filter management to thrombectomy and chronic venous reconstruction.',
    highlight: 'DVT, PE, and chronic venous obstruction support',
    procedures: [
      'IVC filter placement and removal',
      'Deep vein thrombectomy',
      'Recanalization and stent placement',
      'Pulmonary embolism thrombectomy/thrombolysis',
      'Varicose vein ablation',
    ],
  },
  {
    slug: 'diagnostic-procedures',
    title: 'Diagnostic Procedures',
    description: 'High-yield image-guided diagnostic sampling and vascular studies that support precise treatment planning.',
    highlight: 'Targeted sampling and angiographic diagnostics',
    procedures: [
      'Transjugular liver biopsy',
      'Pulmonary arteriography',
      'Adrenal and parathyroid vein sampling',
      'Soft tissue biopsy and fluid aspiration',
      'Bone marrow aspiration/biopsy',
    ],
  },
  {
    slug: 'spine-procedures',
    title: 'Spine',
    description: 'Image-guided spinal pain and fracture interventions designed for durable symptom relief and mobility recovery.',
    highlight: 'Pain blocks and vertebral stabilization',
    procedures: [
      'Vertebral augmentation',
      'Sacroplasty',
      'Epidural injection',
      'Selective nerve root block',
      'Medial branch block and rhizotomy',
    ],
  },
  {
    slug: 'miscellaneous-procedures',
    title: 'Miscellaneous',
    description: 'Additional problem-solving interventions for complex or less common procedural needs.',
    highlight: 'Specialized minimally invasive solutions',
    procedures: [
      'Foreign body retrieval',
      'Cyst sclerotherapy',
      'Biliary endoscopy',
    ],
  },
];

export type IRCondition = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  treatmentExamples: string[];
};

export const irConditions: IRCondition[] = [
  {
    slug: 'peripheral-artery-disease',
    title: 'Peripheral Artery Disease (PAD)',
    subtitle: 'Blocked leg arteries and reduced blood flow',
    description: 'IR opens narrowed arteries to improve circulation, reduce pain, and lower limb risk.',
    treatmentExamples: ['Angioplasty', 'Stenting', 'Atherectomy'],
  },
  {
    slug: 'deep-vein-thrombosis',
    title: 'Deep Vein Thrombosis (DVT)',
    subtitle: 'Blood clots in deep veins',
    description: 'Image-guided catheter therapies help remove or dissolve clots and preserve vein function.',
    treatmentExamples: ['Catheter-directed thrombolysis', 'Mechanical thrombectomy', 'IVC filter management'],
  },
  {
    slug: 'uterine-fibroids',
    title: 'Uterine Fibroids',
    subtitle: 'Heavy bleeding, pain, and pelvic pressure',
    description: 'Uterine fibroid embolization shrinks fibroids without major surgery.',
    treatmentExamples: ['Uterine fibroid embolization (UFE)', 'Targeted uterine artery embolization'],
  },
  {
    slug: 'aortic-aneurysm',
    title: 'Aortic Aneurysm',
    subtitle: 'Weakening and bulging of the aorta',
    description: 'Endovascular aneurysm repair supports the vessel from within using minimally invasive techniques.',
    treatmentExamples: ['Endovascular stent graft placement', 'Image-guided vascular surveillance'],
  },
  {
    slug: 'varicose-veins',
    title: 'Varicose Veins',
    subtitle: 'Symptomatic venous insufficiency',
    description: 'IR vein procedures close refluxing veins and improve pain, swelling, and appearance.',
    treatmentExamples: ['Endovenous ablation', 'Sclerotherapy', 'Ambulatory phlebectomy'],
  },
  {
    slug: 'liver-kidney-tumors',
    title: 'Liver & Kidney Tumors',
    subtitle: 'Primary or metastatic tumour care',
    description: 'IR offers targeted tumour treatment options that can complement oncology and surgery plans.',
    treatmentExamples: ['Tumour embolization', 'Thermal ablation', 'Image-guided biopsy'],
  },
  {
    slug: 'portal-hypertension-gi-disorders',
    title: 'Portal Hypertension & GI Disorders',
    subtitle: 'Complications of liver and portal venous disease',
    description: 'Advanced portal venous procedures reduce pressure and control bleeding risk.',
    treatmentExamples: ['TIPS placement', 'Portal vein recanalization', 'Transvenous obliteration'],
  },
];

export const faqs = [
  {
    q: 'How is an ultrasound guided biopsy different from a CT guided biopsy?',
    a: 'Ultrasound guided biopsies use sound waves — no radiation — and are ideal for superficial organs like thyroid, breast, and liver. CT guided biopsies use X-ray imaging and are better for deep lesions like lung nodules and deep lymph nodes that ultrasound cannot reach.',
  },
  {
    q: 'Is a CT guided biopsy painful?',
    a: 'Most patients report only mild pressure, not pain. Local anaesthesia numbs the needle entry site before the procedure. You may feel brief pressure when the needle samples tissue, but sharp pain is uncommon.',
  },
  {
    q: 'How long does a biopsy procedure take?',
    a: 'Ultrasound guided biopsies take 15–30 minutes. CT guided biopsies take 30–60 minutes. Post-procedure monitoring ranges from 1–4 hours depending on the biopsy site. Most patients are discharged the same day.',
  },
  {
    q: 'How much does a biopsy cost in Nairobi?',
    a: 'Cost depends on biopsy type, number of samples, consumables, and pathology fees. CT guided procedures typically cost more than ultrasound guided ones. Contact Dr Alice on 0716 521 406 for a transparent quotation before your procedure.',
  },
  {
    q: 'Do I need a referral from my doctor?',
    a: 'A referral is recommended as it helps understand your clinical context, but it is not strictly required. You are welcome to contact Dr Alice directly to discuss your situation.',
  },
  {
    q: 'How accurate is a biopsy?',
    a: 'Image-guided biopsies have a diagnostic accuracy of over 90%. CT and ultrasound guidance allow precise targeting, maximising the chance of obtaining a representative tissue sample.',
  },
  {
    q: 'How do I prepare for a biopsy?',
    a: 'Bring your referral letter, imaging reports, medication list (especially blood thinners), and ID. Discuss blood thinner management in advance. Fasting may be required for certain procedures.',
  },
];

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  readTime: string;
  date: string;
  content: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'biopsy-cost-nairobi',
    title: 'How Much Does a Biopsy Cost in Nairobi?',
    excerpt: 'A transparent breakdown of biopsy costs in Nairobi, Kenya — what affects pricing and what to expect.',
    readTime: '4 min read',
    date: '2025-11-15',
    content: [
      'The honest answer is that biopsy cost depends on several factors, but Dr Alice always provides a transparent estimate before any procedure.',
      'Cost depends on: the type of biopsy (CT guided typically costs more than ultrasound guided), complexity of the target lesion, number and type of biopsy needles used, pathology and laboratory analysis fees, and any additional monitoring requirements.',
      'Contact Dr Alice on 0716 521 406 or 0745 902 757 for a clear quotation promptly.',
    ],
  },
  {
    slug: 'ct-biopsy-pain',
    title: 'Is a CT Guided Biopsy Painful? What to Expect',
    excerpt: 'Understanding pain management during CT guided biopsies and what patients can expect during recovery.',
    readTime: '3 min read',
    date: '2025-10-28',
    content: [
      'Pain during biopsy is one of the most common concerns patients have. Understanding what to expect can significantly reduce anxiety.',
      'Biopsies are performed under local anaesthesia. The skin and tissue along the needle path are numbed before insertion. Most patients report only mild pressure during tissue sampling.',
      'Recovery is typically straightforward with same-day discharge for most procedures.',
    ],
  },
  {
    slug: 'biopsy-duration',
    title: 'How Long Does a Biopsy Procedure Take?',
    excerpt: 'Duration of different biopsy types — from quick ultrasound guided to complex CT guided procedures.',
    readTime: '3 min read',
    date: '2025-10-10',
    content: [
      'Ultrasound guided biopsies are generally faster: thyroid FNA takes 10–20 minutes, breast biopsy 15–25 minutes, and liver biopsy 15–30 minutes.',
      'CT guided biopsies take longer due to imaging requirements: lung biopsy 30–60 minutes, deep lymph node biopsy 30–45 minutes.',
      'Lung biopsies require longer monitoring to check for pneumothorax. Most patients are discharged the same day.',
    ],
  },
  {
    slug: 'biopsy-preparation',
    title: 'How to Prepare for a Biopsy Procedure',
    excerpt: 'Complete guide to preparing for your biopsy — what to bring, medication adjustments, and what to expect.',
    readTime: '5 min read',
    date: '2025-09-22',
    content: [
      'Bring your referral letter, relevant imaging reports, medication list (especially blood thinners), and national ID.',
      'Discuss blood thinner management with Dr Alice in advance — some medications need to be paused before the procedure.',
      'Wear comfortable clothing and arrange for someone to accompany you home after the procedure.',
    ],
  },
  {
    slug: 'biopsy-recovery',
    title: 'CT Guided Biopsy Recovery Time: What to Expect',
    excerpt: 'Post-procedure monitoring, activity restrictions, and when to seek medical attention after a biopsy.',
    readTime: '4 min read',
    date: '2025-09-05',
    content: [
      'Recovery after a CT guided biopsy is typically fast. Most patients resume light activities within 24–48 hours.',
      'Avoid strenuous activity for 48 hours. Keep the biopsy site clean and dry. Watch for signs of bleeding, fever, or increasing pain.',
      'For lung biopsies, a follow-up chest X-ray checks for pneumothorax before discharge.',
    ],
  },
  {
    slug: 'ultrasound-biopsy-guide',
    title: 'Ultrasound Guided Biopsy: Step-by-Step Procedure Guide',
    excerpt: 'What happens during thyroid, breast, liver, and lymph node biopsies — radiation-free and minimally invasive.',
    readTime: '5 min read',
    date: '2025-08-18',
    content: [
      'Ultrasound guided biopsy is one of the most common procedures performed at Apexcareir.',
      'The procedure begins with ultrasound imaging to locate the target lesion. Local anaesthesia is administered, then a fine needle or core biopsy needle samples tissue under real-time guidance.',
      'The entire process is radiation-free, minimally invasive, and most patients go home the same day.',
    ],
  },
];

export const preparationChecklist = [
  'Referral letter or clinical notes',
  'Relevant imaging reports (CT, ultrasound, MRI)',
  'Medication list — especially blood thinners',
  'National ID or passport',
  'Comfortable, loose-fitting clothing',
  'Someone to accompany you home',
];

export const costFactors = [
  'Type of biopsy (CT vs ultrasound guided)',
  'Complexity and location of the lesion',
  'Number and type of tissue samples needed',
  'Consumables and biopsy needles used',
  'Pathology and laboratory analysis fees',
  'Post-procedure monitoring requirements',
];

export const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/faq', label: 'FAQ' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
];
