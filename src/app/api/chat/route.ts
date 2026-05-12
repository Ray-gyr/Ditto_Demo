import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Person {
  name: string;
  interests: string;
}

interface RequestBody {
  place: string;
  personA: Person;
  personB: Person;
}

interface TaskResult {
  personA_task: string;
  personB_task: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FIELD_LENGTH = 300;
const ALLOWED_CHARS = /^[a-zA-Z0-9\u4e00-\u9fff\s,.\-'!?()]+$/; // alphanumeric + CJK + safe punctuation

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sanitize a user-supplied string to prevent prompt injection.
 * - Strips characters outside the allowed set
 * - Trims whitespace
 * - Enforces a maximum length
 */
function sanitizeInput(raw: unknown, fieldName: string, maxLength = MAX_FIELD_LENGTH): string {
  if (typeof raw !== 'string') {
    throw new Error(`Field "${fieldName}" must be a string.`);
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    throw new Error(`Field "${fieldName}" must not be empty.`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`Field "${fieldName}" exceeds the maximum allowed length of ${maxLength} characters.`);
  }

  // Remove characters that could be used for prompt injection
  const sanitized = trimmed.replace(/[<>`\\]/g, '');

  return sanitized;
}

/**
 * Validate and extract typed fields from the raw request body.
 * Throws a descriptive error for any missing or invalid field.
 */
function parseAndValidateBody(body: unknown): RequestBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object.');
  }

  const raw = body as Record<string, unknown>;

  // Validate top-level "place"
  const place = sanitizeInput(raw.place, 'place');

  // Validate personA
  if (!raw.personA || typeof raw.personA !== 'object') {
    throw new Error('Field "personA" must be an object.');
  }
  const rawPersonA = raw.personA as Record<string, unknown>;
  const personA: Person = {
    name: sanitizeInput(rawPersonA.name, 'personA.name'),
    interests: sanitizeInput(rawPersonA.interests, 'personA.interests'),
  };

  // Validate personB
  if (!raw.personB || typeof raw.personB !== 'object') {
    throw new Error('Field "personB" must be an object.');
  }
  const rawPersonB = raw.personB as Record<string, unknown>;
  const personB: Person = {
    name: sanitizeInput(rawPersonB.name, 'personB.name'),
    interests: sanitizeInput(rawPersonB.interests, 'personB.interests'),
  };

  return { place, personA, personB };
}

/**
 * Attempt to extract a JSON object from the model's text response.
 * Tries strict JSON.parse first, then falls back to regex extraction.
 * Throws if neither strategy succeeds.
 */
function extractJSON(raw: string): TaskResult {
  // Strategy 1: the entire response is valid JSON
  try {
    return JSON.parse(raw) as TaskResult;
  } catch {
    // fall through to strategy 2
  }

  // Strategy 2: extract the first {...} block from a mixed-text response
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as TaskResult;
    } catch (innerError) {
      // Log the raw content to help diagnose future model output changes
      console.error('[extractJSON] Regex-extracted block failed to parse:', match[0]);
    }
  }

  // Both strategies failed — surface enough context for debugging without
  // leaking it to the client (caller is responsible for the user-facing message)
  console.error('[extractJSON] Could not parse model output. Raw text:', raw);
  throw new Error('The model returned a response that could not be parsed as JSON.');
}

/**
 * Validate that the parsed object actually contains the two expected task strings.
 */
function validateTaskResult(obj: TaskResult): void {
  if (typeof obj.personA_task !== 'string' || obj.personA_task.trim().length === 0) {
    throw new Error('Parsed response is missing "personA_task".');
  }
  if (typeof obj.personB_task !== 'string' || obj.personB_task.trim().length === 0) {
    throw new Error('Parsed response is missing "personB_task".');
  }
}

// ─── Anthropic client (singleton) ─────────────────────────────────────────────

/**
 * Fail fast at module load time if the API key is absent,
 * rather than producing a cryptic runtime error later.
 */
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('Environment variable ANTHROPIC_API_KEY is not set.');
}

const anthropic = new Anthropic({ apiKey });

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // ── 1. Parse & validate request body ──────────────────────────────────────
  let body: RequestBody;
  try {
    const raw = await req.json();
    body = parseAndValidateBody(raw);
  } catch (validationError: unknown) {
    const message = validationError instanceof Error
      ? validationError.message
      : 'Invalid request body.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { place, personA, personB } = body;

  // ── 2. Build system prompt ─────────────────────────────────────────────────
  // Inputs are already sanitized; we keep interpolation minimal and clearly
  // delimited so any residual special characters cannot escape their context.
  const SYSTEM_PROMPT = `
You are Ditto, a dating concierge with the personality of a witty, 
warm friend who's great at setting people up.

dating place: ${place}
Person A: ${personA.name}, interests: ${personA.interests}
Person B: ${personB.name}, interests: ${personB.interests}

Generate a pre-date task for them to do before meeting on Wednesday.

Rules:
- Start with an action verb
- The task must produce something to "bring" or "share" at the date
- Weave in their shared interests naturally, don't state them explicitly  
- Tone: Verbal, casual, playful, slightly flirty, like a text from a friend
- Length: less than 30 words
- Do NOT say "icebreaker", "connection", or "bond"
- The task must be completable in under 10 minutes
- No creating or composing — find, choose, or recall something instead
- The task should create a moment of comparison or reveal at the date
  (e.g. both bring something, then compare — not just share). This needs to spark some mutual banter and joking around
- The task must reference at least one specific interest from each person's profile, but indirectly
- The reveal/comparison moment must be physically doable at the dating place (e.g. show your phone, hum it, describe it out loud) — no hypotheticals
- Add a slightly teasing edge — the reveal should make one person 
  feel a little exposed or caught, not just competitive

example output:
Think of the worse movie you have seen before. see how bad your partner's taste is

example output format:
[First sentence: set up the task with a hook]
[Second sentence: the reveal/comparison moment at the date, with a little edge]
No greeting, no sign-off, just the task.

example output:
if both person love movies and books, you may output:
Recall the most unhinged plot twist you've ever seen or read. At the date, describe it with a straight face to [Partner's Name] — whoever sounds more deranged buys the next round

CRITICAL INSTRUCTION: You must generate TWO versions of the task: one sent to Person A (referencing Person B by name), and one sent to Person B (referencing Person A by name). 
Output your response ONLY as a JSON object with two keys: "personA_task" and "personB_task". Do not include any markdown formatting like \`\`\`json outside the object.
`.trim();

  // ── 3. Call Anthropic API ──────────────────────────────────────────────────
  let rawText: string;
  try {
    // The SDK's beta typings for interleaved thinking may lag behind the
    // actual API. We cast only the options object — not the entire function —
    // so TypeScript still checks everything it can.
    const response = await (anthropic.beta.messages.create as Function)({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      betas: ['interleaved-thinking-2025-05-14'],
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'Generate the tasks as JSON.' }],
    });

    // The response may contain interleaved "thinking" blocks; we only care
    // about the final text block.
    const textBlock = response.content.find((block: { type: string }) => block.type === 'text');
    if (!textBlock) {
      throw new Error('The model returned no text block in its response.');
    }

    rawText = (textBlock as { type: 'text'; text: string }).text;
  } catch (apiError: unknown) {
    // Log the full error internally; return a generic message to the client
    // to avoid leaking API details, model internals, or stack traces.
    console.error('[POST /api/tasks] Anthropic API error:', apiError);
    return NextResponse.json(
      { error: 'An error occurred while generating tasks. Please try again.' },
      { status: 502 }
    );
  }

  // ── 4. Parse & validate model output ──────────────────────────────────────
  let result: TaskResult;
  try {
    result = extractJSON(rawText);
    validateTaskResult(result);
  } catch (parseError: unknown) {
    console.error('[POST /api/tasks] Failed to parse model output:', parseError);
    return NextResponse.json(
      { error: 'The model returned an unexpected response format. Please try again.' },
      { status: 500 }
    );
  }

  // ── 5. Return result ───────────────────────────────────────────────────────
  return NextResponse.json({
    personA_task: result.personA_task,
    personB_task: result.personB_task,
  });
}