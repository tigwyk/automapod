'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UpgradePrompt } from '@/components/upgrade-prompt';

type UploadPhase = 'idle' | 'presigning' | 'uploading' | 'saving' | 'error';

interface SimpleUploadFormProps {
  podcastTitle: string;
  podcastId: string;
  backUrl: string;
}

export function SimpleUploadForm({ podcastTitle, podcastId, backUrl }: SimpleUploadFormProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const abortRef = useRef<XMLHttpRequest | null>(null);

  const isSubmitting = phase !== 'idle' && phase !== 'error';

  function clearErrors() {
    setError(null);
    setUpgradeReason(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUpgradeReason(null);
    setProgress(0);

    const form = e.currentTarget;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim();
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value.trim();
    const fileInput = form.elements.namedItem('audio') as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!title) {
      setError('Title is required');
      return;
    }
    if (!file) {
      setError('Audio file is required');
      return;
    }

    try {
      // ── Phase 1: get presigned URL ─────────────────────────────────────
      setPhase('presigning');

      const presignRes = await fetch('/api/r2/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'audio/mpeg',
          fileSize: file.size,
          podcastId,
        }),
      });

      if (!presignRes.ok) {
        const json = await presignRes.json() as { error?: string; upgradeRequired?: boolean };
        if (json.upgradeRequired) {
          setUpgradeReason(json.error ?? 'Upgrade required');
          setPhase('error');
          return;
        }
        throw new Error(json.error ?? 'Failed to prepare upload');
      }

      const { presignedUrl, audioUrl } = await presignRes.json() as {
        presignedUrl: string;
        audioUrl: string;
      };

      // ── Phase 2: upload file directly to R2 ───────────────────────────
      setPhase('uploading');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        abortRef.current = xhr;

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed (HTTP ${xhr.status})`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed — network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
        xhr.send(file);
      });

      // ── Phase 3: create episode record ────────────────────────────────
      setPhase('saving');

      const createRes = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, audioUrl, podcastId }),
      });

      if (!createRes.ok) {
        const json = await createRes.json() as { error?: string };
        throw new Error(json.error ?? 'Failed to save episode');
      }

      // Success — redirect to episode list
      router.push(backUrl);
      router.refresh();
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }

  const phaseLabel: Record<UploadPhase, string> = {
    idle: 'Upload Episode',
    presigning: 'Preparing upload…',
    uploading: `Uploading… ${progress}%`,
    saving: 'Saving episode…',
    error: 'Upload Episode',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload New Episode</h1>
        <p className="text-gray-600 mt-1">
          Add a new episode to <span className="font-semibold">{podcastTitle}</span>
        </p>
      </div>

      {upgradeReason && (
        <UpgradePrompt reason={upgradeReason} className="mb-4" />
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-8a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-2 0v4a1 1 0 112 0V4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} onChange={clearErrors} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              id="title"
              required
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
              placeholder="Episode title"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
              placeholder="Episode description"
            />
          </div>

          <div>
            <label htmlFor="audio" className="block text-sm font-medium text-gray-700">
              Audio File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              name="audio"
              id="audio"
              accept="audio/*"
              required
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
            />
            <p className="mt-1 text-sm text-gray-500">MP3, M4A, WAV, or OGG (max 500MB)</p>
          </div>

          {/* Upload progress bar */}
          {phase === 'uploading' && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Uploading audio…</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => router.push(backUrl)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phaseLabel[phase]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
