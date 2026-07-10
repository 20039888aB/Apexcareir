from functools import lru_cache
from typing import Dict, List, Optional

from .knowledge import get_knowledge_base
from .llm import ollama_generate
from .rag import rag_stats, retrieve_relevant_chunks

BASE_DISCLAIMER = (
    "Important: This information is for education only and is not a medical diagnosis. "
    "Only a qualified healthcare professional can confirm a diagnosis after examination and tests."
)


def _contains_any(text: str, terms: List[str]) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in terms)


def _bullets(items: List[str], limit: int = 6) -> str:
    return "\n".join(f"- {item}" for item in items[:limit])


def _pick_variant(seed: str, options: List[str]) -> str:
    if not options:
        return ""
    return options[sum(ord(char) for char in seed) % len(options)]


@lru_cache(maxsize=1)
def _build_index() -> Dict[str, List[str]]:
    kb = get_knowledge_base()
    index: Dict[str, List[str]] = {}
    for bucket in ["procedures", "conditions", "symptom_mappings", "faqs", "medications", "devices"]:
        for entry in kb[bucket]:
            for token in "".join(char if char.isalnum() else " " for char in entry.lower()).split():
                if len(token) <= 2:
                    continue
                index.setdefault(token, []).append(entry)
    return index


def knowledge_stats() -> Dict[str, int]:
    kb = get_knowledge_base()
    retrieval_stats = rag_stats()
    return {
        "frequently_asked_questions": len(kb["faqs"]),
        "procedures_and_interventions": len(kb["procedures"]),
        "conditions": len(kb["conditions"]),
        "symptom_mappings": len(kb["symptom_mappings"]),
        "preparation_recovery_guides": len(kb["prep_recovery_guides"]),
        "medications": len(kb["medications"]),
        "devices_and_consumables": len(kb["devices"]),
        "patient_education_articles": len(kb["education_articles"]),
        "rag_documents": retrieval_stats["document_count"],
        "rag_chunks": retrieval_stats["chunk_count"],
    }


def _search_candidates(message: str, bucket: str, limit: int = 6) -> List[str]:
    kb = get_knowledge_base()
    query_tokens = [token for token in "".join(char if char.isalnum() else " " for char in message.lower()).split() if len(token) > 2]
    if not query_tokens:
        return kb[bucket][:limit]
    index = _build_index()
    scores: Dict[str, int] = {}
    for token in query_tokens:
        for candidate in index.get(token, []):
            if candidate in kb[bucket]:
                scores[candidate] = scores.get(candidate, 0) + 1
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return [name for name, _ in ranked[:limit]] or kb[bucket][:limit]


def _confidence(message: str) -> str:
    lowered = message.lower()
    if _contains_any(lowered, ["severe", "sudden", "worsening", "unstable"]):
        return "Low Confidence"
    if _contains_any(lowered, ["follow-up", "known", "chronic"]):
        return "Moderate Confidence"
    return "Moderate Confidence"


def _evidence(message: str) -> str:
    lowered = message.lower()
    if _contains_any(lowered, ["guideline", "standard", "protocol"]):
        return "Strong evidence"
    if _contains_any(lowered, ["rare", "unusual", "case"]):
        return "Limited evidence"
    return "Moderate evidence"


def _closing_prompt() -> str:
    return "Would you like a patient-friendly explanation, a detailed medical explanation, or an Interventional Radiologist's perspective?"


def _classify_intent(message: str) -> str:
    lowered = message.lower().strip()
    greeting_terms = [
        "hi",
        "hello",
        "hey",
        "good morning",
        "good afternoon",
        "good evening",
        "greetings",
        "yo",
        "nice to meet you",
        "good to see you",
        "welcome",
    ]
    gratitude_terms = ["thank you", "thanks", "appreciate it", "much appreciated", "thank u"]
    farewell_terms = ["bye", "goodbye", "see you", "see you later", "take care", "catch you later"]
    casual_terms = ["how are you", "what's up", "whats up", "how is your day", "how are you doing", "sup"]
    feedback_terms = ["great", "awesome", "nice", "good job", "that helps", "perfect", "not helpful", "confusing"]
    medical_terms = [
        "pain",
        "swelling",
        "bleeding",
        "fever",
        "procedure",
        "diagnosis",
        "treatment",
        "symptom",
        "embolization",
        "ablation",
        "biopsy",
        "stent",
        "catheter",
        "dvt",
        "cancer",
        "radiology",
        "interventional",
        "ufe",
        "pae",
        "tace",
        "tips",
        "evar",
        "tevar",
    ]

    if _contains_any(lowered, gratitude_terms):
        return "gratitude"
    if _contains_any(lowered, farewell_terms):
        return "farewell"
    if _contains_any(lowered, casual_terms):
        return "casual_conversation"
    if _contains_any(lowered, greeting_terms):
        return "greeting"
    if _contains_any(lowered, feedback_terms):
        return "feedback"
    if _contains_any(lowered, medical_terms):
        return "medical_concern"
    if "?" in lowered:
        return "question"
    if _contains_any(lowered, ["please", "i want", "i need", "help me", "show me", "explain"]):
        return "request"
    return "follow_up"


def _build_conversational_response(intent: str, message: str) -> str:
    lowered = message.lower().strip()
    if intent == "greeting":
        return _pick_variant(
            lowered,
            [
                "Hello! It's great to meet you. How can I assist you today?",
                "Hi there. I'm here to help with Interventional Radiology questions and guidance. What would you like to discuss?",
                "Good to connect with you. Whether it's symptoms, procedures, or imaging, I'm here to help. What would you like to discuss?",
                "Welcome. I can support with IR procedures, symptoms, imaging, and preparation. What can I help you with?",
            ],
        )
    if intent == "casual_conversation":
        return _pick_variant(
            lowered,
            [
                "I'm doing well and ready to help. How are you today?",
                "Doing well, thank you. I'm here whenever you're ready with your question.",
                "All good on my side. What would you like help with today?",
                "I'm here and ready to assist. What can I help you with?",
            ],
        )
    if intent == "gratitude":
        return _pick_variant(
            lowered,
            [
                "You're very welcome! If you have any other questions, I'm happy to help.",
                "Glad I could help. Is there anything else you'd like to know about IR or your next steps?",
                "Anytime. If you'd like, I can also explain this in a simpler or more detailed way.",
            ],
        )
    if intent == "farewell":
        return _pick_variant(
            lowered,
            [
                "Take care, and I wish you all the best. Feel free to return anytime if you need assistance.",
                "Goodbye for now. I'm here whenever you need support.",
                "See you later. Reach out again anytime you want help.",
            ],
        )
    if intent == "feedback":
        return _pick_variant(
            lowered,
            [
                "Thank you for the feedback. I appreciate it. What would you like to explore next?",
                "I appreciate that. If you'd like, I can continue with the next step.",
                "Thanks for sharing that. Tell me what you'd like help with now.",
            ],
        )
    return ""


def _needs_clarification(message: str) -> bool:
    lowered = message.lower().strip()
    vague_request_terms = ["i want treatment", "i need treatment", "help me", "what should i do", "what treatment", "i need help"]
    detail_terms = ["pain", "swelling", "bleeding", "fever", "procedure", "condition", "diagnosis", "dvt", "fibroid", "cancer", "kidney", "liver", "lung", "abdomen"]
    return _contains_any(lowered, vague_request_terms) and not _contains_any(lowered, detail_terms)


def _build_follow_up_question(message: str) -> Optional[str]:
    lowered = message.lower()
    if _contains_any(lowered, ["leg pain", "leg hurts", "leg swelling", "calf pain"]):
        return (
            "Could you share a bit more so I can guide you safely?\n\n"
            "- Which leg is affected?\n"
            "- When did it start?\n"
            "- Is there swelling, redness, warmth, or skin color change?\n"
            "- Is the pain constant or intermittent?\n"
            "- Any recent travel, surgery, injury, or immobility?"
        )
    if _contains_any(lowered, ["abdominal pain", "stomach pain", "pelvic pain"]):
        return (
            "To guide you better, could you share:\n\n"
            "- Where exactly the pain is located\n"
            "- How long it has been present\n"
            "- Whether there is fever, vomiting, bleeding, or jaundice\n"
            "- Any known medical conditions or recent procedures"
        )
    if _contains_any(lowered, ["my pain", "it hurts", "i feel unwell"]):
        return (
            "I can help with that. Could you describe your main symptom, where it is, when it started, and whether it is getting worse?"
        )
    return None


def _format_conversation_context(conversation_context: Optional[List[Dict[str, str]]]) -> str:
    if not conversation_context:
        return "No prior conversation context."
    recent = conversation_context[-8:]
    lines = [f"{entry.get('role', 'user').upper()}: {entry.get('content', '').strip()}" for entry in recent if entry.get("content")]
    return "\n".join(lines) if lines else "No prior conversation context."


def _build_llm_system_prompt() -> str:
    return (
        "You are IR Intelligence, a professional Interventional Radiology assistant.\n"
        "Before answering: understand question, determine intent, check if enough info exists, ask follow-up if missing, "
        "consider multiple explanations, explain uncertainty, provide practical next steps.\n"
        "Never fabricate medical facts, lab values, imaging findings, or references. Never provide definitive diagnosis from chat alone.\n"
        "Prioritize emergency warnings when red flags are present.\n"
        "Use a warm, respectful, conversational style.\n"
        "For medical content, use sections when appropriate: Summary, Explanation, Possible Causes, Role of IR, Recommended Tests, "
        "Possible Treatment Options, Benefits, Risks, Recovery, When to Seek Urgent Care, Key Takeaway."
    )


def _build_llm_prompt(message: str, intent: str, retrieved_chunks: List[Dict[str, str]], conversation_context: Optional[List[Dict[str, str]]]) -> str:
    evidence_block = "\n\n".join(
        [
            f"[Source: {chunk['source']} | Section: {chunk['section']}]\n{chunk['text']}"
            for chunk in retrieved_chunks
        ]
    ) or "No retrieved knowledge chunks."

    return (
        f"Intent: {intent}\n\n"
        f"Conversation context:\n{_format_conversation_context(conversation_context)}\n\n"
        f"User message:\n{message}\n\n"
        f"Retrieved knowledge chunks:\n{evidence_block}\n\n"
        "Answer the user now. If details are insufficient, ask concise follow-up questions before making broad assumptions. "
        "If emergency signs are possible, clearly recommend urgent care."
    )


def _build_fallback_medical_response(message: str) -> str:
    symptom_hits = _search_candidates(message, "symptom_mappings", 1)
    condition_hits = _search_candidates(message, "conditions", 6)
    procedure_hits = _search_candidates(message, "procedures", 6)
    return "\n\n".join(
        [
            "Summary",
            "Several conditions may explain these symptoms, and diagnosis requires clinical evaluation.",
            "Possible Causes",
            _bullets(condition_hits),
            "Role of Interventional Radiology",
            _bullets(
                [
                    "Image-guided diagnostic pathways when clinically indicated",
                    "Minimally invasive treatment options after diagnosis confirmation",
                    "Multidisciplinary planning for safety and outcomes",
                ]
            ),
            "Recommended Tests",
            _bullets(
                [
                    "Focused clinical examination",
                    "Laboratory tests guided by presentation",
                    "Targeted ultrasound/CT/MRI depending on suspected cause",
                    "Urgent emergency review for red-flag features",
                ]
            ),
            "Key Takeaway",
            f"Related symptom context identified: {symptom_hits[0] if symptom_hits else 'general symptom pattern'}.",
            f"Potential IR procedure topics: {', '.join(procedure_hits[:4])}.",
            BASE_DISCLAIMER,
            _closing_prompt(),
        ]
    )


def _build_fallback_procedure_response(message: str) -> str:
    procedure_hits = _search_candidates(message, "procedures", 6)
    return "\n\n".join(
        [
            "Summary",
            "This appears to be a procedure-focused question in Interventional Radiology.",
            "What It Is",
            f"{procedure_hits[0] if procedure_hits else 'The requested procedure'} is an image-guided intervention selected after clinical and imaging review.",
            "Why It Is Done",
            _bullets(
                [
                    "To treat a confirmed target condition in a minimally invasive way",
                    "To reduce symptoms or disease burden when appropriate",
                    "To support diagnosis or therapy planning depending on indication",
                ]
            ),
            "Preparation",
            _bullets(
                [
                    "Clinical assessment and imaging review",
                    "Medication and bleeding-risk review",
                    "Consent discussion and peri-procedure planning",
                ]
            ),
            "Benefits",
            _bullets(["Targeted minimally invasive approach", "Often shorter recovery than open surgery in selected patients"]),
            "Risks",
            _bullets(["Bleeding", "Infection", "Contrast-related effects", "Need for repeat intervention"]),
            "Recovery",
            _bullets(["Observation and discharge guidance", "Follow-up based on procedure and diagnosis"]),
            BASE_DISCLAIMER,
            _closing_prompt(),
        ]
    )


def generate_reply(message: str, conversation_context: Optional[List[Dict[str, str]]] = None) -> Dict[str, object]:
    kb = get_knowledge_base()
    lowered = message.lower().strip()

    if _contains_any(lowered, kb["red_flags"]):
        reply = "\n\n".join(
            [
                "Summary",
                "Your message contains possible emergency warning signs.",
                "When to Seek Urgent Care",
                _bullets(
                    [
                        "Seek immediate emergency care now.",
                        "Do not delay evaluation for severe or rapidly worsening symptoms.",
                        "Call local emergency services if needed.",
                    ]
                ),
                BASE_DISCLAIMER,
                _closing_prompt(),
            ]
        )
        return {"reply": reply, "confidence": "Low Confidence", "evidence": "Strong evidence", "category": "emergency"}

    intent = _classify_intent(message)
    conversational = _build_conversational_response(intent, message)
    if conversational:
        return {"reply": conversational, "confidence": "High Confidence", "evidence": "Strong evidence", "category": intent}

    if _needs_clarification(message):
        reply = (
            "I can help with that. Could you tell me which condition, symptoms, or procedure you're referring to?\n\n"
            "For example, you can share where the symptoms are, how long they've been present, and whether they're worsening."
        )
        return {"reply": reply, "confidence": "Moderate Confidence", "evidence": "Strong evidence", "category": "clarification"}

    follow_up = _build_follow_up_question(message)
    if follow_up and intent in {"medical_concern", "request", "follow_up"}:
        return {"reply": follow_up, "confidence": "Moderate Confidence", "evidence": "Strong evidence", "category": "clarification"}

    if _contains_any(lowered, ["how many", "knowledge base", "faq", "stats", "coverage"]):
        stats = knowledge_stats()
        reply = "\n\n".join(
            [
                "Knowledge Base Coverage",
                _bullets(
                    [
                        f"Frequently asked questions: {stats['frequently_asked_questions']}",
                        f"Procedures and interventions: {stats['procedures_and_interventions']}",
                        f"Conditions: {stats['conditions']}",
                        f"Symptom mappings: {stats['symptom_mappings']}",
                        f"Preparation/recovery guides: {stats['preparation_recovery_guides']}",
                        f"Medications: {stats['medications']}",
                        f"Devices and consumables: {stats['devices_and_consumables']}",
                        f"Patient education articles: {stats['patient_education_articles']}",
                        f"RAG documents indexed: {stats['rag_documents']}",
                        f"RAG chunks indexed: {stats['rag_chunks']}",
                    ],
                    10,
                ),
                "Evidence Sources",
                _bullets(kb["evidence_sources"], 5),
                BASE_DISCLAIMER,
                _closing_prompt(),
            ]
        )
        return {"reply": reply, "confidence": "High Confidence", "evidence": "Strong evidence", "category": "knowledge_stats"}

    retrieved_chunks = retrieve_relevant_chunks(message, top_k=8)
    llm_reply = ollama_generate(
        prompt=_build_llm_prompt(message=message, intent=intent, retrieved_chunks=retrieved_chunks, conversation_context=conversation_context),
        system_prompt=_build_llm_system_prompt(),
    )

    if llm_reply:
        if _closing_prompt() not in llm_reply:
            llm_reply = f"{llm_reply}\n\n{_closing_prompt()}"
        if BASE_DISCLAIMER not in llm_reply and intent in {"medical_concern", "question", "request", "follow_up"}:
            llm_reply = f"{llm_reply}\n\n{BASE_DISCLAIMER}"
        if retrieved_chunks:
            sources = ", ".join(sorted({chunk["source"] for chunk in retrieved_chunks[:5]}))
            llm_reply = f"{llm_reply}\n\nSources consulted: {sources}"
        evidence = "Strong evidence" if retrieved_chunks else _evidence(message)
        return {"reply": llm_reply, "confidence": _confidence(message), "evidence": evidence, "category": "rag_llama"}

    if _contains_any(
        lowered,
        [
            "what is",
            "how is",
            "procedure",
            "ufe",
            "pae",
            "tace",
            "y90",
            "tare",
            "tips",
            "evar",
            "tevar",
            "embolization",
            "ablation",
            "biopsy",
            "stenting",
        ],
    ):
        return {
            "reply": _build_fallback_procedure_response(message),
            "confidence": _confidence(message),
            "evidence": _evidence(message),
            "category": "procedure_fallback",
        }

    fallback_reply = _build_fallback_medical_response(message)
    return {"reply": fallback_reply, "confidence": _confidence(message), "evidence": _evidence(message), "category": "general_fallback"}
