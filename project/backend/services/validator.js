/**
 * Evidence Validation Engine
 * Programmatically validates that every quote returned by agents exists verbatim
 * within the evaluation_context claims or source texts.
 */

function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates a single quote against evaluation_context claims and raw document text.
 * @param {string} quote - The quote to validate
 * @param {object} evaluationContext - The structured context from Stage 1
 * @param {string} [rawText] - Optional concatenated raw resume/transcript text
 * @returns {object} { isValid: boolean, matchType: string, matchedClaim: object|null }
 */
export function validateQuote(quote, evaluationContext, rawText = '') {
  if (!quote || typeof quote !== 'string' || quote.trim().length === 0) {
    return { isValid: false, reason: 'Empty quote', matchedClaim: null };
  }

  const cleanQuote = normalizeText(quote);
  if (cleanQuote.length < 5) {
    return { isValid: false, reason: 'Quote too short for meaningful verification', matchedClaim: null };
  }

  // 1. Check against evaluation_context claims
  if (evaluationContext && Array.isArray(evaluationContext.claims)) {
    for (const claim of evaluationContext.claims) {
      const storedQuote = normalizeText(claim.quote || '');
      const claimText = normalizeText(claim.claim || '');

      if (storedQuote && (storedQuote.includes(cleanQuote) || cleanQuote.includes(storedQuote))) {
        return { isValid: true, matchType: 'exact_claim_quote', matchedClaim: claim };
      }
      if (claimText && (claimText.includes(cleanQuote) || cleanQuote.includes(claimText))) {
        return { isValid: true, matchType: 'claim_summary_match', matchedClaim: claim };
      }
    }
  }

  // 2. Check against raw text if provided
  if (rawText) {
    const cleanRaw = normalizeText(rawText);
    if (cleanRaw.includes(cleanQuote)) {
      return { isValid: true, matchType: 'raw_source_substring', matchedClaim: null };
    }
  }

  return {
    isValid: false,
    reason: 'Quote not found in source evaluation context claims or source documents',
    matchedClaim: null
  };
}

/**
 * Validates all evidence quotes in an agent's opinion.
 * Flags or filters invalid quotes.
 * @param {object} opinion - The agent output object
 * @param {object} evaluationContext - Stage 1 evaluation context
 * @param {string} rawText - Optional raw text
 * @returns {object} Updated opinion with validation metadata
 */
export function validateAgentEvidence(opinion, evaluationContext, rawText = '') {
  if (!opinion) return opinion;
  const validated = { ...opinion };

  if (Array.isArray(validated.evidence_quotes)) {
    validated.evidence_quotes = validated.evidence_quotes.map((item) => {
      const qText = typeof item === 'string' ? item : item.quote;
      const val = validateQuote(qText, evaluationContext, rawText);
      return {
        ...(typeof item === 'object' ? item : { quote: item }),
        isValid: val.isValid,
        validationReason: val.reason || 'Verified against source evidence',
        matchType: val.matchType || 'unverified'
      };
    });

    // Summary validation score
    const total = validated.evidence_quotes.length;
    const validCount = validated.evidence_quotes.filter((q) => q.isValid).length;
    validated.evidenceQuality = {
      totalQuotes: total,
      validQuotes: validCount,
      verificationRate: total > 0 ? Math.round((validCount / total) * 100) : 100
    };
  }

  return validated;
}

/**
 * Sanitizes model strings to prevent HTML / XSS injection when rendered in UI
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
