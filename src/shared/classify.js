// Heuristic classification of copied text. Pure function, no side effects.

const URL_PATTERN = /^(?:https?:\/\/|ftp:\/\/|www\.)\S+$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NUMBER_PATTERN = /^[+\-]?[\d\s.,()\-]+$/;
const CODE_HINTS = [
  /[{};]\s*$/m,
  /=>/,
  /\b(?:function|const|let|var|return|import|export|class|def|elif|public|private|static|void|async|await)\b/,
  /<\/?[a-z][\w-]*(?:\s[^>]*)?>/i,
  /\b(?:SELECT|INSERT|UPDATE|DELETE)\b[\s\S]*\b(?:FROM|INTO|SET|WHERE)\b/i,
  /^\s{2,}\S/m,
  /^\t+\S/m,
  /#include\s*</,
  /console\.\w+\(/
];
const CODE_SCORE_THRESHOLD = 2;
const CODE_MIN_LENGTH = 8;
const LINK_LIST_MAX_LINES = 20;

function looksLikeJson(text) {
  const first = text[0];
  const last = text[text.length - 1];
  if (!((first === '{' && last === '}') || (first === '[' && last === ']'))) return false;
  try {
    JSON.parse(text);
    return true;
  } catch (_) {
    return false;
  }
}

function classifyText(rawText) {
  const text = (rawText || '').trim();
  if (!text) return KIND.TEXT;

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= LINK_LIST_MAX_LINES && lines.every((line) => URL_PATTERN.test(line))) {
    return KIND.LINK;
  }
  if (lines.length === 1 && EMAIL_PATTERN.test(text)) return KIND.EMAIL;
  if (lines.length === 1 && NUMBER_PATTERN.test(text) && /\d/.test(text)) return KIND.NUMBER;

  if (text.length >= CODE_MIN_LENGTH) {
    if (looksLikeJson(text)) return KIND.CODE;
    const score = CODE_HINTS.reduce((sum, pattern) => sum + (pattern.test(text) ? 1 : 0), 0);
    if (score >= CODE_SCORE_THRESHOLD) return KIND.CODE;
  }
  return KIND.TEXT;
}
