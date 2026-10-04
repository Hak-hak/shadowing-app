// Speech recognition and audio recorder service for student practice

export interface SpeechRecognitionResultData {
  transcript: string;
  confidence: number;
}

export class SpeechPracticeService {
  private recognition: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordedAudioUrl: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      }
    }
  }

  public isSpeechRecognitionSupported(): boolean {
    return this.recognition !== null;
  }

  public async startListening(callbacks: {
    onInterim?: (text: string) => void;
    onFinal?: (text: string) => void;
    onError?: (err: any) => void;
  }) {
    if (this.recordedAudioUrl) {
      URL.revokeObjectURL(this.recordedAudioUrl);
      this.recordedAudioUrl = null;
    }

    // Try starting MediaRecorder for playback of user's own voice
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.recordedAudioUrl = URL.createObjectURL(audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        };
        this.mediaRecorder.start();
      }
    } catch (e) {
      console.warn('Microphone stream error or permission denied:', e);
    }

    if (this.recognition) {
      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (callbacks.onInterim && interim) {
          callbacks.onInterim(interim);
        }
        if (callbacks.onFinal && final) {
          callbacks.onFinal(final);
        }
      };

      this.recognition.onerror = (event: any) => {
        if (callbacks.onError) callbacks.onError(event.error);
      };

      try {
        this.recognition.start();
      } catch (err) {
        // Recognition might already be running
        console.warn('Recognition start exception:', err);
      }
    }
  }

  public stopListening(): Promise<string | null> {
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {
          // ignore
        }
      }

      // Small delay to allow audio recording blob to construct
      setTimeout(() => {
        resolve(this.recordedAudioUrl);
      }, 300);
    });
  }

  public getRecordedAudioUrl(): string | null {
    return this.recordedAudioUrl;
  }
}

export const speechPractice = new SpeechPracticeService();
