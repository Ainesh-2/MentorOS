# Build Prompts — MentorOS

This document log maintains the target system instructions, prompt guides, and templates utilized for generative builds of frontend features or backend routers in the project.

---

## AI Companion Prompt Guidelines
- **Context**: The chatbot functions as an AI Mentor assistant.
- **Data Access**: Restrict recommendations to student metrics fetched via authorized backend requests.
- **Tone**: Keep communication academic, encouraging, and clear.
- **Constraints**: Prompt outputs must be formatted in markdown.

---

## Scoring Engine Prompt Guidelines
- **Input Parameters**: Validate incoming grades (CGPA) and attendance percentages (0-100%).
- **Weighting Controls**: Ensure the mathematical calculation enforces:
  `0.35 * attendance + 0.35 * academic + 0.15 * engagement + 0.15 * placement`.
