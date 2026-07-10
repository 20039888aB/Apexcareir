from functools import lru_cache
from typing import Dict, List


def _unique_limit(values: List[str], limit: int) -> List[str]:
    cleaned = [value.strip() for value in values if value and value.strip()]
    return list(dict.fromkeys(cleaned))[:limit]


@lru_cache(maxsize=1)
def get_knowledge_base() -> Dict[str, List[str]]:
    procedures_seed = [
        "Angioplasty",
        "Stenting",
        "Atherectomy",
        "Mechanical thrombectomy",
        "Aspiration thrombectomy",
        "Catheter-directed thrombolysis",
        "Venoplasty",
        "Fistuloplasty",
        "Uterine fibroid embolization (UFE)",
        "Prostate artery embolization (PAE)",
        "Varicocele embolization",
        "Pelvic congestion embolization",
        "Bronchial artery embolization",
        "Trauma embolization",
        "GI bleeding embolization",
        "Transarterial chemoembolization (TACE)",
        "Transarterial radioembolization (TARE / Y-90)",
        "Microwave ablation",
        "Radiofrequency ablation",
        "Cryoablation",
        "Image-guided biopsy",
        "Liver biopsy (transjugular)",
        "Lung biopsy",
        "Bone biopsy",
        "Percutaneous abscess drainage",
        "Pleural drainage",
        "Nephrostomy",
        "Biliary drainage",
        "Cholecystostomy",
        "Gastrostomy",
        "PICC placement",
        "Port placement",
        "Dialysis catheter placement",
        "IVC filter placement",
        "IVC filter retrieval",
        "TIPS creation",
        "TIPS revision",
        "Lymphangiography",
        "Thoracic duct embolization",
        "Foam sclerotherapy",
        "Endovenous ablation",
        "Vertebroplasty",
        "Kyphoplasty",
        "Epidural steroid injection",
        "Facet injection",
        "Aortic stent grafting (EVAR)",
        "Thoracic endovascular aortic repair (TEVAR)",
        "Endoleak embolization",
    ]
    approach_terms = [
        "Ultrasound-guided",
        "CT-guided",
        "Fluoroscopy-guided",
        "Transradial",
        "Transfemoral",
        "Transjugular",
        "Percutaneous",
        "Endovascular",
        "Image-guided",
    ]
    targets = [
        "arterial recanalization",
        "venous recanalization",
        "arterial embolization",
        "venous embolization",
        "drainage catheter placement",
        "tumor ablation",
        "biliary decompression",
        "urinary decompression",
        "dialysis access intervention",
        "stent revision",
        "pseudoaneurysm exclusion",
        "portal intervention",
    ]
    procedure_clinical_intents = [
        "for acute ischemia",
        "for chronic ischemia",
        "for bleeding control",
        "for symptom control",
        "for tumor management",
        "for access salvage",
        "for complication management",
        "for palliative care support",
    ]
    procedure_sites = [
        "aortoiliac",
        "femoropopliteal",
        "tibial",
        "renal",
        "mesenteric",
        "hepatic",
        "pulmonary",
        "iliocaval",
        "portal",
        "dialysis access",
    ]
    procedures = _unique_limit(
        procedures_seed
        + [f"{approach} {target}" for approach in approach_terms for target in targets]
        + [
            f"{approach} {target} {intent}"
            for approach in approach_terms
            for target in targets
            for intent in procedure_clinical_intents
        ]
        + [
            f"{approach} {site} {target}"
            for approach in approach_terms
            for site in procedure_sites
            for target in targets[:8]
        ],
        320,
    )

    territories = [
        "Aortoiliac",
        "Femoropopliteal",
        "Tibial",
        "Carotid",
        "Subclavian",
        "Renal arterial",
        "Mesenteric arterial",
        "Celiac",
        "Hepatic arterial",
        "Portal venous",
        "Iliocaval venous",
        "Upper extremity venous",
        "Lower extremity venous",
        "SVC",
        "IVC",
        "Dialysis access",
        "Uterine arterial",
        "Prostatic arterial",
    ]
    vascular_pathologies = [
        "stenosis",
        "occlusion",
        "thrombosis",
        "embolism",
        "aneurysm",
        "pseudoaneurysm",
        "arteriovenous malformation",
        "arteriovenous fistula",
        "rupture",
        "restenosis",
        "chronic total occlusion",
    ]
    non_vascular_organs = [
        "Liver",
        "Kidney",
        "Lung",
        "Pancreas",
        "Spleen",
        "Gallbladder",
        "Bile duct",
        "Urinary tract",
        "Pleural space",
        "Peritoneal cavity",
        "Uterus",
        "Prostate",
        "Bone",
        "Spine",
        "Lymph node",
        "Retroperitoneum",
        "Pelvic",
    ]
    non_vascular_pathologies = [
        "abscess",
        "fluid collection",
        "obstruction",
        "stricture",
        "leak",
        "fistula",
        "benign tumor",
        "malignant tumor",
        "metastatic disease",
        "hemorrhage",
        "cyst",
    ]
    condition_qualifiers = ["Acute", "Chronic", "Recurrent"]
    key_conditions = [
        "Peripheral artery disease",
        "Deep vein thrombosis",
        "Pulmonary embolism",
        "Varicose veins",
        "Post-thrombotic syndrome",
        "Chronic venous insufficiency",
        "Uterine fibroids",
        "Adenomyosis",
        "Pelvic congestion syndrome",
        "Benign prostatic hyperplasia",
        "Hepatocellular carcinoma",
        "Liver metastases",
        "Portal hypertension",
        "Biliary obstruction",
        "Hydronephrosis",
        "Hemoptysis",
        "GI hemorrhage",
        "Dialysis access dysfunction",
    ]
    conditions = _unique_limit(
        key_conditions
        + [f"{territory} {pathology}" for territory in territories for pathology in vascular_pathologies]
        + [f"{organ} {pathology}" for organ in non_vascular_organs for pathology in non_vascular_pathologies],
        620,
    )
    conditions = _unique_limit(
        conditions + [f"{qualifier} {condition}" for qualifier in condition_qualifiers for condition in conditions],
        680,
    )

    symptom_seeds = [
        "leg pain",
        "leg swelling",
        "calf pain",
        "cold foot",
        "blue toe",
        "abdominal pain",
        "jaundice",
        "flank pain",
        "blood in urine",
        "fever and chills",
        "shortness of breath",
        "coughing blood",
        "pelvic pain",
        "heavy menstrual bleeding",
        "urinary retention",
        "back pain",
        "dialysis access not working",
        "post-procedure pain",
        "line site redness",
        "line not flushing",
        "black stool",
        "vomiting blood",
        "recurrent ascites",
    ]
    contexts = [
        "at rest",
        "after walking",
        "with fever",
        "with weight loss",
        "after recent surgery",
        "after trauma",
        "with known cancer",
        "with known liver disease",
        "during pregnancy",
        "postpartum",
        "at night",
        "with dizziness",
        "with nausea",
        "with urinary symptoms",
        "with breathing difficulty",
        "with chest tightness",
    ]
    symptom_modifiers = [
        "mild",
        "moderate",
        "severe",
        "sudden",
        "intermittent",
        "progressive",
    ]
    symptom_mappings = _unique_limit(
        symptom_seeds
        + [f"{symptom} {context}" for symptom in symptom_seeds for context in contexts]
        + [
            f"{modifier} {symptom} {context}"
            for modifier in symptom_modifiers
            for symptom in symptom_seeds
            for context in contexts
        ],
        2300,
    )

    faq_stems = [
        "What is",
        "How does",
        "Why is",
        "When is",
        "Who is a candidate for",
        "How should I prepare for",
        "What are the risks of",
        "How long is recovery after",
        "Can IR help with",
        "What tests are needed before",
    ]
    faq_topics = procedures[:60] + conditions[:70] + [
        "contrast dye reactions",
        "radiation safety",
        "anticoagulant management",
        "sedation options",
        "warning signs after discharge",
    ]
    faqs = _unique_limit([f"{stem} {topic}?" for stem in faq_stems for topic in faq_topics], 520)

    medications = _unique_limit(
        [
            "Midazolam",
            "Fentanyl",
            "Morphine",
            "Hydromorphone",
            "Ketamine",
            "Propofol",
            "Lidocaine",
            "Bupivacaine",
            "Unfractionated heparin",
            "Enoxaparin",
            "Warfarin",
            "Apixaban",
            "Rivaroxaban",
            "Dabigatran",
            "Aspirin",
            "Clopidogrel",
            "Protamine sulfate",
            "Vitamin K",
            "Idarucizumab",
            "Andexanet alfa",
            "Alteplase (tPA)",
            "Tenecteplase",
            "Iodinated contrast media",
            "Gadolinium-based contrast media",
            "Cefazolin",
            "Ceftriaxone",
            "Piperacillin-tazobactam",
            "Metronidazole",
            "Ondansetron",
            "Dexamethasone",
        ]
        + [f"Periprocedural medication protocol {idx + 1}" for idx in range(130)],
        160,
    )

    devices = _unique_limit(
        [
            "Micropuncture access kit",
            "Access needle",
            "Introducer sheath",
            "Guidewire",
            "Hydrophilic guidewire",
            "Stiff guidewire",
            "Diagnostic catheter",
            "Microcatheter",
            "Balloon catheter",
            "Bare metal stent",
            "Covered stent",
            "Stent graft",
            "IVC filter",
            "Coils",
            "Vascular plug",
            "Liquid embolic agent",
            "Microspheres",
            "Drainage catheter",
            "Nephrostomy catheter",
            "Biliary drainage catheter",
            "PICC line",
            "Tunneled dialysis catheter",
            "Implantable venous port",
            "Biopsy needle",
            "Core biopsy gun",
            "Ablation probe",
            "Contrast injector",
            "Ultrasound machine",
            "Fluoroscopy system",
            "Angiography suite",
        ]
        + [f"IR consumable set {idx + 1}" for idx in range(90)],
        110,
    )

    prep_recovery_guides = _unique_limit(
        [
            f"{procedure}: preparation checklist"
            for procedure in procedures[:120]
        ]
        + [f"{procedure}: recovery and warning signs guide" for procedure in procedures[:120]],
        240,
    )

    education_articles = _unique_limit(
        [f"Patient guide: understanding {procedure}" for procedure in procedures[:140]]
        + [f"Patient guide: living with {condition}" for condition in conditions[:180]]
        + [f"IR education article series {idx + 1}" for idx in range(260)],
        580,
    )

    red_flags = [
        "chest pain",
        "difficulty breathing",
        "severe bleeding",
        "massive bleeding",
        "loss of consciousness",
        "sudden weakness",
        "stroke symptoms",
        "blue limb",
        "cold limb",
        "coughing blood",
        "high fever with confusion",
        "severe trauma",
    ]

    return {
        "procedures": procedures,
        "conditions": conditions,
        "symptom_mappings": symptom_mappings,
        "faqs": faqs,
        "medications": medications,
        "devices": devices,
        "prep_recovery_guides": prep_recovery_guides,
        "education_articles": education_articles,
        "red_flags": red_flags,
        "evidence_sources": [
            "Society of Interventional Radiology (SIR) condition/treatment resources",
            "CIRSE patient leaflets and practice resources",
            "Peer-reviewed IR sedation and analgesia literature",
            "Standard IR procedural taxonomy references",
        ],
    }
