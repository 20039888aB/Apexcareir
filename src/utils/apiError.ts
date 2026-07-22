import axios from 'axios';

/** Extract a readable message from an Axios/API error response. */
export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) {
      return data.trim();
    }
    if (data && typeof data === 'object') {
      const detail = (data as { detail?: unknown }).detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail.trim();
      }
      if (Array.isArray(detail) && detail.length > 0) {
        return detail.map(String).join(' ');
      }
      const nonField = (data as { non_field_errors?: unknown }).non_field_errors;
      if (Array.isArray(nonField) && nonField.length > 0) {
        return nonField.map(String).join(' ');
      }
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
