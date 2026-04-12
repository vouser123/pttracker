// lib/fetch-with-offline.js — shared JSON fetch wrapper for offline-aware authenticated read requests.

import {
  isNetworkUnavailableError,
  markNetworkFailure,
  markNetworkSuccess,
} from './network-status';

function parseErrorMessage(prefix, status, payload) {
  const payloadMessage =
    typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.message === 'string'
        ? payload.message
        : null;

  return payloadMessage ?? `${prefix} (${status})`;
}

export function buildAuthHeaders(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    : {
        'Content-Type': 'application/json',
      };
}

export class OfflineRequestError extends Error {
  constructor(message, { cause = null, url = '' } = {}) {
    super(message);
    this.name = 'OfflineRequestError';
    this.cause = cause;
    this.url = url;
  }
}

export class HttpRequestError extends Error {
  constructor(message, { status, payload = null, url = '' } = {}) {
    super(message);
    this.name = 'HttpRequestError';
    this.status = status;
    this.payload = payload;
    this.url = url;
  }
}

export class ParseRequestError extends Error {
  constructor(message, { cause = null, url = '' } = {}) {
    super(message);
    this.name = 'ParseRequestError';
    this.cause = cause;
    this.url = url;
  }
}

export function isOfflineRequestError(error) {
  return error instanceof OfflineRequestError;
}

export function isHttpRequestError(error) {
  return error instanceof HttpRequestError;
}

export async function fetchJsonWithOffline(
  url,
  {
    token,
    method = 'GET',
    body,
    headers = {},
    errorPrefix = 'Request failed',
    offlineMessage = 'Offline - request unavailable.',
  } = {},
) {
  const requestHeaders = {
    ...buildAuthHeaders(token),
    ...headers,
  };

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (markNetworkFailure(error) || isNetworkUnavailableError(error)) {
      throw new OfflineRequestError(offlineMessage, { cause: error, url });
    }
    throw error;
  }

  let payload = null;
  const hasJsonBody = response.status !== 204;

  if (hasJsonBody) {
    try {
      payload = await response.json();
    } catch (error) {
      if (response.ok) {
        throw new ParseRequestError(`${errorPrefix} returned invalid JSON.`, { cause: error, url });
      }
    }
  }

  if (!response.ok) {
    throw new HttpRequestError(parseErrorMessage(errorPrefix, response.status, payload), {
      status: response.status,
      payload,
      url,
    });
  }

  markNetworkSuccess();
  return payload;
}
