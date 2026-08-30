import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import apiClient from './api-client';
import { getStudyPlan, regenerateStudyPlan } from './study-plan-service';
import { API } from '@/constants/api-endpoints';
import { MOCK_STUDY_PLAN } from '@/mocks/mock-data';

vi.mock('./api-client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);

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

describe('getStudyPlan', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('requests the study-plan endpoint and returns its payload', async () => {
    getMock.mockResolvedValue({ data: MOCK_STUDY_PLAN });

    await expect(getStudyPlan()).resolves.toEqual(MOCK_STUDY_PLAN);
    expect(getMock).toHaveBeenCalledWith(API.STUDY_PLAN.GET);
  });

  it('rethrows a 4xx failure instead of masking it with mock data', async () => {
    getMock.mockRejectedValue(axiosErrorWithStatus(401));

    await expect(getStudyPlan()).rejects.toBeInstanceOf(AxiosError);
  });

  it('falls back to mock data when the backend is unavailable (5xx)', async () => {
    getMock.mockRejectedValue(axiosErrorWithStatus(500));

    await expect(getStudyPlan()).resolves.toEqual(MOCK_STUDY_PLAN);
  });

  it('falls back to mock data on a network error with no response at all', async () => {
    getMock.mockRejectedValue(new Error('Network Error'));

    await expect(getStudyPlan()).resolves.toEqual(MOCK_STUDY_PLAN);
  });
});

describe('regenerateStudyPlan', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts to the regenerate endpoint and returns its payload', async () => {
    postMock.mockResolvedValue({ data: MOCK_STUDY_PLAN });

    await expect(regenerateStudyPlan()).resolves.toEqual(MOCK_STUDY_PLAN);
    expect(postMock).toHaveBeenCalledWith(API.STUDY_PLAN.REGENERATE);
  });

  it('rethrows a 4xx failure instead of masking it with mock data', async () => {
    postMock.mockRejectedValue(axiosErrorWithStatus(403));

    await expect(regenerateStudyPlan()).rejects.toBeInstanceOf(AxiosError);
  });
});
