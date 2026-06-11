export type PublishResult =
  | { ok: true; externalUrl?: string }
  | { ok: false; error: string };

export interface PublishInput {
  caption: string;
  /** Storage path of the video inside the `videos` bucket. */
  videoPath: string;
  /** Short-lived signed URL for downloading the video server-side. */
  signedUrl: string;
  /** Long-lived signed URL safe to embed in a message. */
  shareUrl: string;
  /** Video size in bytes. */
  videoSize: number;
  /** The platform row's `config` jsonb. */
  config: Record<string, unknown>;
}

export interface PlatformAdapter {
  id: string;
  /** Publish the video. Adapters must never throw — return { ok: false } instead. */
  publish(input: PublishInput): Promise<PublishResult>;
}
