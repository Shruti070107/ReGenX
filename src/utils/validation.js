export function sanitizeNumber(value) {
  if (value === null || value === undefined) return null;

  const cleaned = String(value).trim();

  if (cleaned === '') return null;

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) return null;

  return parsed;
}

export function validateNumber(value, {
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  decimals = 2,
  required = true,
  allowZero = true
} = {}) {
  const parsed = sanitizeNumber(value);

  if (parsed === null) {
    return {
      valid: !required,
      error: required ? 'Value is required.' : null,
      value: null
    };
  }

  if (!allowZero && parsed === 0) {
    return {
      valid: false,
      error: 'Zero is not allowed.',
      value: null
    };
  }

  if (parsed < min) {
    return {
      valid: false,
      error: `Minimum allowed value is ${min}.`,
      value: null
    };
  }

  if (parsed > max) {
    return {
      valid: false,
      error: `Maximum allowed value is ${max}.`,
      value: null
    };
  }

  const decimalPart = parsed.toString().split('.')[1];

  if (decimalPart && decimalPart.length > decimals) {
    return {
      valid: false,
      error: `Only ${decimals} decimal places allowed.`,
      value: null
    };
  }

  return {
    valid: true,
    error: null,
    value: parsed
  };
}

export function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
