import { describe, expect, it } from 'vitest';
import { getApiErrorDetail } from './api-errors';

describe('getApiErrorDetail', () => {
  it('extracts a human-readable message from structured API details', () => {
    expect(
      getApiErrorDetail({
        response: {
          data: {
            detail: {
              code: 'account_unverified',
              message: 'Account exists but is not verified. Check your email.',
            },
          },
        },
      })
    ).toBe('Account exists but is not verified. Check your email.');
  });

  it('returns plain string details unchanged', () => {
    expect(
      getApiErrorDetail({
        response: {
          data: {
            detail: 'Email already registered',
          },
        },
      })
    ).toBe('Email already registered');
  });
});