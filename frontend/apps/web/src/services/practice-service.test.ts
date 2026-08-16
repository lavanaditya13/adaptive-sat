import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import apiClient from './api-client';
import { getLatestResult } from './practice-service';
import { API } from '@/constants/api-endpoints';
import { MOCK_COMPLETE_RESPONSE } from '@/mocks/mock-data';

vi.mock('./api-client', () => ({
  default: { get: vi.fn() },
}));

const getMock = vi.mocked(apiClient.get);

function axiosErrorWithStatus(status: number): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('request failed', String(status), config, null, {
    status,
    statusText: '',
    data: { detail: 'nope' },
    headers: {},
    config,
  });
}

describe('getLatestResult', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('requests the latest-result endpoint and returns its payload', async () => {
    getMock.mockResolvedValue({ data: MOCK_COMPLETE_RESPONSE });

    await expect(getLatestResult()).resolves.toEqual(MOCK_COMPLETE_RESPONSE);
    expect(getMock).toHaveBeenCalledWith(API.PRACTICE.LATEST_RESULT);
  });

  it('maps the backend\'s "no completed session" 404 to null rather than throwing', async () => {
    getMock.mockRejectedValue(axiosErrorWithStatus(404));

    await expect(getLatestResult()).resolves.toBeNull();
  });

  it('rethrows other failures so the page can show an error instead of a fake empty state', async () => {
    getMock.mockRejectedValue(axiosErrorWithStatus(500));

    await expect(getLatestResult()).rejects.toBeInstanceOf(AxiosError);
  });

  it('rethrows network errors, which carry no response at all', async () => {
    getMock.mockRejectedValue(new Error('Network Error'));

    await expect(getLatestResult()).rejects.toThrow('Network Error');
  });
});
