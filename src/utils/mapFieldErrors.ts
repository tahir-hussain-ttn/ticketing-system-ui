import type { ApiError } from "../types/apiError";

export interface FieldErrorMap {
  fieldErrors: Record<string, string>;
  generalErrors: string[];
}

/**
 * Splits an ApiError's fieldErrors into ones matching a known form field
 * (for inline FormHelperText) and ones that don't (shown as general errors
 * instead of being dropped silently).
 */
export function mapFieldErrors(
  error: ApiError,
  knownFields: readonly string[],
): FieldErrorMap {
  const fieldErrors: Record<string, string> = {};
  const generalErrors: string[] = [];

  for (const fieldError of error.fieldErrors ?? []) {
    if (knownFields.includes(fieldError.field)) {
      fieldErrors[fieldError.field] = fieldError.message;
    } else {
      generalErrors.push(fieldError.message);
    }
  }

  if (generalErrors.length === 0 && Object.keys(fieldErrors).length === 0) {
    generalErrors.push(error.message);
  }

  return { fieldErrors, generalErrors };
}
