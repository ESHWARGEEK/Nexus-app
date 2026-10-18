export interface STTTranscriptionResult {
  text: string;
  speaker: string;
  is_final: boolean;
  confidence?: number;
}

/**
 * Transcribe an audio snippet or base64 chunk through Google Cloud Speech-to-Text backend
 */
export async function transcribeAudio(
  audioData: string | Blob,
  options?: { mimeType?: string; speaker?: string }
): Promise<STTTranscriptionResult> {
  try {
    let base64String = '';
    let detectedMime = options?.mimeType || 'audio/webm';

    if (typeof audioData === 'string') {
      base64String = audioData;
    } else if (audioData instanceof Blob) {
      detectedMime = audioData.type || detectedMime;
      const buffer = await audioData.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64String = btoa(binary);
    }

    const response = await fetch('/api/stt/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        audio: base64String,
        mimeType: detectedMime,
        speaker: options?.speaker || 'Participant'
      }),
    });

    if (!response.ok) {
      throw new Error(`STT API returned status ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.text || '',
      speaker: data.speaker || options?.speaker || 'Participant',
      is_final: data.is_final ?? true,
      confidence: data.confidence ?? 0.98,
    };
  } catch (err: any) {
    console.warn('STT service error:', err.message);
    return {
      text: '',
      speaker: options?.speaker || 'Participant',
      is_final: true,
      confidence: 0,
    };
  }
}
