import type { ClientMessage } from "../../../shared/protocol";

export type ConnectionState = "idle" | "connecting" | "connected direct" | "connected relay" | "disconnected" | "failed";

export interface RTCManagerOptions {
  onStateChange: (state: ConnectionState) => void;
  onDataChannel: (channel: RTCDataChannel) => void;
  sendSignaling: (msg: ClientMessage) => void;
  forceRelay?: boolean;
}

export class RTCManager {
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
  options: RTCManagerOptions;
  poller?: ReturnType<typeof setInterval>;

  constructor(options: RTCManagerOptions) {
    this.options = options;

    const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

    const turnUrl = import.meta.env.VITE_TURN_URL;
    const turnUser = import.meta.env.VITE_TURN_USERNAME;
    const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;

    if (turnUrl && turnUser && turnCred) {
      iceServers.push({
        urls: turnUrl,
        username: turnUser,
        credential: turnCred,
      });
    }

    const config: RTCConfiguration = { iceServers };
    
    if (options.forceRelay) {
      config.iceTransportPolicy = "relay";
    }

    this.pc = new RTCPeerConnection(config);

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.options.sendSignaling({ t: "signal", data: { candidate: e.candidate.toJSON() } });
      }
    };

    this.pc.onconnectionstatechange = () => {
      switch (this.pc.connectionState) {
        case "new":
        case "connecting":
          this.options.onStateChange("connecting");
          break;
        case "connected":
          this.checkStats();
          break;
        case "disconnected":
        case "closed":
          this.options.onStateChange("disconnected");
          this.stopStats();
          break;
        case "failed":
          this.options.onStateChange("failed");
          this.stopStats();
          break;
      }
    };

    this.pc.ondatachannel = (e) => {
      this.dc = e.channel;
      this.options.onDataChannel(e.channel);
    };
  }

  async createOffer() {
    this.dc = this.pc.createDataChannel("tether", { ordered: true });
    this.dc.bufferedAmountLowThreshold = 1048576; // 1 MiB per AGENTS.md
    this.options.onDataChannel(this.dc);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.options.sendSignaling({ t: "signal", data: { description: this.pc.localDescription?.toJSON() } });
  }

  async handleSignal(data: any) {
    if (data.description) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(data.description));
      if (data.description.type === "offer") {
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.options.sendSignaling({ t: "signal", data: { description: this.pc.localDescription?.toJSON() } });
      }
    } else if (data.candidate) {
      await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }

  stopStats() {
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = undefined;
    }
  }

  async checkStats() {
    this.stopStats();
    // Run immediately once, then poll
    const updateStats = async () => {
      if (this.pc.connectionState !== "connected") return;
      try {
        const stats = await this.pc.getStats();
        let isRelay = false;
        let activeCandidatePairId = "";
        
        stats.forEach((report) => {
          if (report.type === "transport" && report.state === "connected") {
            activeCandidatePairId = report.selectedCandidatePairId;
          }
        });
        
        // Fallback for some browsers where transport doesn't have selectedCandidatePairId
        if (!activeCandidatePairId) {
           stats.forEach((report) => {
             if (report.type === "candidate-pair" && report.state === "succeeded" && report.selected) {
               activeCandidatePairId = report.id;
             }
           });
        }
        
        if (activeCandidatePairId) {
          const pair = stats.get(activeCandidatePairId);
          if (pair) {
            const local = stats.get(pair.localCandidateId);
            const remote = stats.get(pair.remoteCandidateId);
            if ((local && local.candidateType === "relay") || (remote && remote.candidateType === "relay")) {
              isRelay = true;
            }
          }
        }
  
        this.options.onStateChange(isRelay ? "connected relay" : "connected direct");
      } catch (err) {
        console.error("Error getting stats", err);
      }
    };
    
    await updateStats();
    this.poller = setInterval(updateStats, 2000);
  }

  close() {
    this.stopStats();
    if (this.dc) {
      this.dc.close();
    }
    this.pc.close();
  }
}
