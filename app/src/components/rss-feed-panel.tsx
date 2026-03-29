'use client';

import { useState } from 'react';

interface RssFeedPanelProps {
  feedUrl: string;
}

export function RssFeedPanel({ feedUrl }: RssFeedPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-8 card-elevated p-6">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110 2 1 1 0 010-2z" />
        </svg>
        <h2 className="text-lg font-semibold text-foreground">RSS Feed</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Use this URL to submit your podcast to directories like Apple Podcasts and Spotify.
      </p>

      <div className="flex items-center gap-2 mb-6">
        <input
          type="text"
          readOnly
          value={feedUrl}
          data-testid="rss-feed-url"
          className="input flex-1 font-mono text-sm bg-muted/50"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          data-testid="copy-rss-url"
          className="btn btn-outline shrink-0"
          aria-label="Copy RSS feed URL"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground mb-3">Submit to directories</p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://podcastsconnect.apple.com/my-podcasts/new-feed"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 4a2 2 0 110 4 2 2 0 010-4zm4 10.5c0 .28-.22.5-.5.5h-7a.5.5 0 01-.5-.5v-1c0-.28.22-.5.5-.5H11v-3h-.5a.5.5 0 01-.5-.5v-1c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5V15h.5c.28 0 .5.22.5.5v1z"/>
            </svg>
            Apple Podcasts
          </a>
          <a
            href="https://podcasters.spotify.com/pod/submit"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 01-.277-1.215c3.809-.87 7.077-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.722a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.519.781.781 0 01.52-.974c3.632-1.102 8.147-.568 11.233 1.329a.78.78 0 01.257 1.073zm.105-2.835c-3.223-1.914-8.54-2.09-11.618-1.156a.935.935 0 11-.543-1.79c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-1.554 1.608z"/>
            </svg>
            Spotify
          </a>
        </div>
      </div>
    </div>
  );
}
