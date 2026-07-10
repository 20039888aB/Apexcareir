import { irKnowledgeBase, irKnowledgeBaseStats } from '../data/irKnowledgeBase';

const baseDisclaimer =
  'Important: This information is for education only and is not a medical diagnosis. Only a qualified healthcare professional can confirm a diagnosis after appropriate examination and tests.';

function getTimeOfDayGreeting() {
  const hourInNairobi = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Africa/Nairobi',
    }).format(new Date()),
  );

  if (hourInNairobi < 12) return 'Good morning';
  if (hourInNairobi < 18) return 'Good afternoon';
  return 'Good evening';
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function pickResponse(options: string[]) {
  const index = Math.floor(Math.random() * options.length);
  return options[index];
}

const conversationalIntents = [
  {
    key: 'greeting',
    triggers: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    responses: (greeting: string) => [
      `${greeting}. I am ApexcareIR AI. How can I help you with Interventional Radiology today?`,
      `${greeting}. Welcome to ApexcareIR AI. You can ask about IR procedures, recovery, preparation, or likely possibilities.`,
      `${greeting}. I can help explain Interventional Radiology conditions and treatment options in an educational way.`,
      `${greeting}. Feel free to ask any IR-related question, including symptoms, procedures, and follow-up care.`,
      `${greeting}. I can provide a patient-friendly explanation, a detailed medical explanation, or an Interventional Radiologist perspective.`,
    ],
  },
  {
    key: 'how_are_you',
    triggers: ['how are you', 'how are you doing', 'how is your day', 'how is your day going'],
    responses: () => [
      'I am doing well, thank you. I am ready to help with your Interventional Radiology questions.',
      'I am here and ready to assist. You can ask about IR procedures, conditions, and preparation.',
      'I am well. How can I support you today with Interventional Radiology information?',
    ],
  },
  {
    key: 'whats_up',
    triggers: ["what's up", 'whats up', 'wassup', 'sup', 'whats app'],
    responses: () => [
      'All good here. I am ready to help with Interventional Radiology guidance and education.',
      'I am here to support with IR information, from procedures to recovery and safety.',
      'Ready when you are. Ask me anything related to Interventional Radiology.',
    ],
  },
  {
    key: 'who_are_you',
    triggers: ['who are you', 'what are you'],
    responses: () => [
      'I am ApexcareIR AI, an educational Interventional Radiology assistant.',
      'I am ApexcareIR AI. I provide patient education on IR procedures, conditions, and preparation.',
    ],
  },
  {
    key: 'help',
    triggers: ['what can you do', 'help', 'assist me', 'can you help'],
    responses: () => [
      'I can explain IR procedures, possible causes of symptoms, preparation, recovery, and red-flag warnings.',
      'I can help you understand Interventional Radiology in a clear, patient-friendly way.',
      `I can provide educational IR guidance and likely possibilities. ${baseDisclaimer}`,
    ],
  },
];

type ConfidenceLevel = 'High Confidence' | 'Moderate Confidence' | 'Low Confidence';
type EvidenceStrength = 'Strong evidence' | 'Moderate evidence' | 'Limited evidence' | 'Emerging evidence';

function bulletList(items: string[], maxItems = 6) {
  return items.slice(0, maxItems).map((item) => `- ${item}`).join('\n');
}

function closingStylePrompt() {
  return "Would you like a patient-friendly explanation, a detailed medical explanation, or an Interventional Radiologist's perspective?";
}

function chooseConfidence(input: string): ConfidenceLevel {
  if (containsAny(input, ['severe', 'sudden', 'worsening', 'unstable'])) return 'Low Confidence';
  if (containsAny(input, ['chronic', 'known', 'follow-up', 'post-procedure'])) return 'Moderate Confidence';
  return 'Moderate Confidence';
}

function chooseEvidence(input: string): EvidenceStrength {
  if (containsAny(input, ['new', 'novel', 'experimental'])) return 'Emerging evidence';
  if (containsAny(input, ['case', 'rare', 'unusual'])) return 'Limited evidence';
  if (containsAny(input, ['guideline', 'standard', 'protocol'])) return 'Strong evidence';
  return 'Moderate evidence';
}

function findBestSymptomMatch(input: string) {
  const matches = irKnowledgeBase.symptomMappings.filter((entry) => input.includes(entry.symptom));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.symptom.length - a.symptom.length)[0];
}

function buildSymptomResponse(input: string) {
  const match = findBestSymptomMatch(input);
  if (!match) return null;

  const confidence = chooseConfidence(input);
  const evidence = chooseEvidence(input);

  return [
    'Summary',
    `Several conditions can produce ${match.symptom}, and urgent risk features must be excluded first.`,
    'Explanation',
    'Interventional Radiology can support diagnosis and treatment when imaging identifies a vascular or image-guided target condition.',
    'Possible Causes',
    bulletList(match.possibilities),
    'Role of Interventional Radiology',
    bulletList([
      'Image-guided confirmation pathways with ultrasound, CT, or angiographic techniques',
      'Minimally invasive treatment options when a treatable target is confirmed',
      'Procedure planning with risk-stratified, multidisciplinary care',
    ]),
    'Recommended Tests',
    bulletList(match.nextSteps),
    'Possible Treatment Options',
    bulletList([
      'Supportive care and monitoring while diagnosis is clarified',
      'Medical therapy guided by the treating clinical team',
      'IR procedures such as thrombectomy, embolization, angioplasty, drainage, or biopsy only when indicated',
    ]),
    'Benefits',
    bulletList(['Targeted minimally invasive therapy', 'Potentially shorter recovery and less tissue trauma']),
    'Risks',
    bulletList(['Bleeding', 'Infection', 'Contrast-related complications', 'Need for additional procedures']),
    'Recovery',
    bulletList(['Observation period', 'Procedure-specific follow-up', 'Early return if red-flag symptoms appear']),
    'When to Seek Urgent Care',
    bulletList([
      'Chest pain, breathing difficulty, severe bleeding, sudden weakness, or loss of consciousness',
      'Rapidly worsening pain, fever with confusion, or a blue/cold limb',
    ]),
    'Clinical Reasoning Note',
    match.caution,
    `Confidence: ${confidence}`,
    `Evidence: ${evidence}`,
    'Key Takeaway',
    'A safe diagnosis cannot be made from symptoms alone. In-person clinical evaluation with targeted testing is essential.',
    baseDisclaimer,
    closingStylePrompt(),
  ].join('\n\n');
}

function buildProcedureResponse(input: string) {
  const procedure = irKnowledgeBase.procedures.find((item) => input.includes(item.toLowerCase()));
  if (!procedure) return null;

  const confidence = chooseConfidence(input);
  const evidence = chooseEvidence(input);

  return [
    'Summary',
    `${procedure} is an image-guided IR intervention used in selected patients after diagnosis and risk assessment.`,
    'Explanation',
    'IR procedures are tailored to anatomy, disease severity, and patient-specific risk factors.',
    'Indications',
    bulletList(['Condition-specific indications based on imaging and clinical findings', 'Failure or unsuitability of less invasive alternatives']),
    'Contraindications',
    bulletList(['Unstable physiology without support', 'Uncorrected coagulopathy in high-risk settings', 'Procedure-specific anatomical limitations']),
    'Preparation',
    bulletList(['Medication review', 'Contrast and renal risk assessment', 'Consent and peri-procedure planning']),
    'Procedure Overview',
    bulletList(['Imaging localization', 'Sterile access', 'Targeted intervention', 'Post-procedure monitoring']),
    'Benefits',
    bulletList(['Minimally invasive pathway', 'Potential symptom relief', 'Targeted treatment delivery']),
    'Risks',
    bulletList(['Bleeding', 'Infection', 'Vessel/organ injury', 'Need for repeat intervention']),
    'Recovery',
    bulletList(['Short recovery for many procedures', 'Activity advice and warning signs at discharge']),
    'Follow-up',
    bulletList(['Clinical review', 'Imaging review when indicated', 'Escalation for recurrent symptoms']),
    `Confidence: ${confidence}`,
    `Evidence: ${evidence}`,
    baseDisclaimer,
    closingStylePrompt(),
  ].join('\n\n');
}

function buildGeneralIrResponse() {
  const topProcedures = irKnowledgeBase.procedures.slice(0, 8);
  const topConditions = irKnowledgeBase.diseases.slice(0, 8);
  return [
    'Summary',
    'Interventional Radiology (IR) is a minimally invasive specialty using imaging to diagnose and treat vascular and non-vascular disease.',
    'Explanation',
    'IR often combines diagnostic imaging, targeted catheter-based therapy, and coordinated multidisciplinary follow-up.',
    'Common Imaging Methods',
    bulletList(irKnowledgeBase.imagingModalities, 6),
    'Common Procedure Examples',
    bulletList(topProcedures),
    'Common Condition Examples',
    bulletList(topConditions),
    'Knowledge Base Snapshot',
    bulletList([
      `${irKnowledgeBaseStats.frequentlyAskedQuestions}+ FAQs`,
      `${irKnowledgeBaseStats.proceduresAndInterventions}+ procedures/interventions`,
      `${irKnowledgeBaseStats.conditions}+ vascular and non-vascular conditions`,
      `${irKnowledgeBaseStats.symptomMappings}+ symptom-to-condition mappings`,
      `${irKnowledgeBaseStats.preparationRecoveryGuides}+ preparation/recovery guides`,
      `${irKnowledgeBaseStats.medications}+ medication entries`,
      `${irKnowledgeBaseStats.devicesAndConsumables}+ devices/consumables`,
      `${irKnowledgeBaseStats.patientEducationArticles}+ patient education articles`,
    ]),
    'Evidence Basis',
    `Built from accepted IR practice domains and patient education resources, including ${irKnowledgeBase.evidenceSources.join(', ')}.`,
    baseDisclaimer,
    closingStylePrompt(),
  ].join('\n\n');
}

function buildKnowledgeStatsResponse() {
  return [
    'Knowledge Base Coverage',
    bulletList([
      `Frequently asked questions: ${irKnowledgeBaseStats.frequentlyAskedQuestions}`,
      `IR procedures and interventions: ${irKnowledgeBaseStats.proceduresAndInterventions}`,
      `Vascular and non-vascular conditions: ${irKnowledgeBaseStats.conditions}`,
      `Symptom-to-possible-condition mappings: ${irKnowledgeBaseStats.symptomMappings}`,
      `Preparation and recovery guides: ${irKnowledgeBaseStats.preparationRecoveryGuides}`,
      `Medications: ${irKnowledgeBaseStats.medications}`,
      `Devices and consumables: ${irKnowledgeBaseStats.devicesAndConsumables}`,
      `Patient education articles: ${irKnowledgeBaseStats.patientEducationArticles}`,
    ]),
    'Evidence Sources',
    bulletList(irKnowledgeBase.evidenceSources),
    baseDisclaimer,
    closingStylePrompt(),
  ].join('\n\n');
}

function buildMedicationResponse() {
  return [
    'Summary',
    'Medication use in IR is procedure-specific and guided by bleeding risk, sedation needs, renal risk, and infection risk.',
    'Medication Categories',
    bulletList(irKnowledgeBase.medications, 12),
    'Safety Notes',
    bulletList([
      'Do not start, stop, or adjust medications without clinician guidance',
      'Anticoagulant and antiplatelet decisions are individualized',
      'Sedation and analgesia dosing is clinician-administered and monitored',
    ]),
    baseDisclaimer,
    closingStylePrompt(),
  ].join('\n\n');
}

function buildDeviceResponse() {
  return [
    'Summary',
    'IR procedures use specialized access, navigation, treatment, and support devices selected for anatomy and procedural goals.',
    'Common Devices and Consumables',
    bulletList(irKnowledgeBase.devices, 12),
    'Clinical Significance',
    bulletList([
      'Device selection affects procedural success and complication risk',
      'Operators combine guidewires, catheters, and imaging for precision',
      'Embolic and stent technologies are matched to disease biology and vessel characteristics',
    ]),
    baseDisclaimer,
    closingStylePrompt(),
  ].join('\n\n');
}

function buildSimpleConversationResponse(input: string) {
  const greeting = getTimeOfDayGreeting();

  for (const intent of conversationalIntents) {
    if (containsAny(input, intent.triggers)) {
      return pickResponse(intent.responses(greeting));
    }
  }

  if (containsAny(input, ['time', 'what time'])) {
    return 'I do not provide time updates, but I can help with Interventional Radiology questions, procedures, and patient guidance.';
  }

  if (containsAny(input, ['date', 'what day', 'today'])) {
    return 'I do not provide date updates, but I can help with Interventional Radiology education and safe next-step guidance.';
  }

  return null;
}

export function generateApexcareAiResponse(userMessage: string) {
  const input = userMessage.toLowerCase();

  const simpleResponse = buildSimpleConversationResponse(input);
  if (simpleResponse) return simpleResponse;

  if (containsAny(input, irKnowledgeBase.redFlags)) {
    return [
      'Emergency warning: Your symptoms may include red-flag signs that need urgent medical attention.',
      'Please seek immediate emergency care or call local emergency services now.',
      'Do not delay urgent medical evaluation.',
      baseDisclaimer,
      closingStylePrompt(),
    ].join('\n\n');
  }

  if (containsAny(input, ['how many', 'knowledge base', 'faqs', 'faq', 'procedures', 'conditions', 'mappings'])) {
    return buildKnowledgeStatsResponse();
  }

  if (containsAny(input, ['medication', 'drug', 'sedation', 'analgesia', 'anticoagulant', 'antiplatelet'])) {
    return buildMedicationResponse();
  }

  if (containsAny(input, ['device', 'catheter', 'guidewire', 'stent', 'coil', 'sheath', 'consumable'])) {
    return buildDeviceResponse();
  }

  const symptomResponse = buildSymptomResponse(input);
  if (symptomResponse) return symptomResponse;

  const procedureResponse = buildProcedureResponse(input);
  if (procedureResponse) return procedureResponse;

  if (containsAny(input, ['diagnosis', 'what do i have', 'do i have', 'cancer'])) {
    return [
      'I cannot diagnose conditions or confirm a disease from chat alone.',
      'Several causes may be possible, and accurate diagnosis requires clinical assessment, imaging, and laboratory tests.',
      'I can help explain likely possibilities and what IR procedures may be considered after confirmation.',
      baseDisclaimer,
      closingStylePrompt(),
    ].join('\n\n');
  }

  return buildGeneralIrResponse();
}

export function generateInitialApexcareAiGreeting() {
  const greeting = getTimeOfDayGreeting();
  return `${greeting}. Welcome to ApexcareIR AI.\n\nI can explain Interventional Radiology, procedures, symptom possibilities, preparation, recovery, medications, and device concepts with safety-first guidance.\n\n${closingStylePrompt()}`;
}
