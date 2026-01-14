
import { MeshMessage } from '../types';

export type PeerStatus = 'idle' | 'connecting' | 'gathering' | 'ready' | 'connected' | 'disconnected' | 'failed';

export class PeerManager {
  private pc: RTCPeerConnection;
  private dc?: RTCDataChannel;
  private onMessage: (msg: MeshMessage) => void;
  private onStatusChange: (status: PeerStatus) => void;

  constructor(onMessage: (msg: MeshMessage) => void, onStatusChange: (status: PeerStatus) => void) {
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    this.pc.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", this.pc.iceConnectionState);
      if (this.pc.iceConnectionState === 'connected') this.onStatusChange('connected');
      if (this.pc.iceConnectionState === 'failed') this.onStatusChange('failed');
      if (this.pc.iceConnectionState === 'disconnected') this.onStatusChange('disconnected');
    };
  }

  private waitForIceGathering() {
    return new Promise<void>((resolve) => {
      if (this.pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        const checkState = () => {
          if (this.pc.iceGatheringState === 'complete') {
            this.pc.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        this.pc.addEventListener('icegatheringstatechange', checkState);
        setTimeout(resolve, 5000); 
      }
    });
  }

  async createOffer(): Promise<string> {
    try {
      this.onStatusChange('connecting');
      this.dc = this.pc.createDataChannel("queue_sync_channel");
      this.setupDataChannel(this.dc);
      
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      
      this.onStatusChange('gathering');
      await this.waitForIceGathering();
      
      this.onStatusChange('ready');
      return btoa(JSON.stringify(this.pc.localDescription));
    } catch (e) {
      this.onStatusChange('failed');
      throw e;
    }
  }

  async handleOffer(offerStr: string): Promise<string> {
    try {
      this.onStatusChange('connecting');
      this.pc.ondatachannel = (event) => {
        this.dc = event.channel;
        this.setupDataChannel(this.dc);
      };

      const offer = JSON.parse(atob(offerStr));
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      this.onStatusChange('gathering');
      await this.waitForIceGathering();
      
      this.onStatusChange('ready');
      return btoa(JSON.stringify(this.pc.localDescription));
    } catch (e) {
      this.onStatusChange('failed');
      throw e;
    }
  }

  async handleAnswer(answerStr: string) {
    try {
      // الحماية من خطأ State: Stable
      if (this.pc.signalingState === 'stable') {
        console.log("Connection already stable, ignoring answer.");
        return;
      }

      const answer = JSON.parse(atob(answerStr));
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (e) {
      this.onStatusChange('failed');
      throw e;
    }
  }

  private setupDataChannel(dc: RTCDataChannel) {
    dc.onopen = () => this.onStatusChange('connected');
    dc.onclose = () => this.onStatusChange('disconnected');
    dc.onmessage = (e) => {
      try {
        const msg: MeshMessage = JSON.parse(e.data);
        this.onMessage(msg);
      } catch (err) {
        console.error("Failed to parse mesh message", err);
      }
    };
  }

  send(msg: MeshMessage) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(msg));
    }
  }

  close() {
    this.pc.close();
    this.onStatusChange('disconnected');
  }
}
