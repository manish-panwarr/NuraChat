let incomingCtx = null;
let incomingInterval = null;
let outgoingCtx = null;
let outgoingInterval = null;

export const ringtoneManager = {
  startIncoming: () => {
    if (incomingCtx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      incomingCtx = new AudioContextClass();

      const playIncomingTone = () => {
        if (!incomingCtx || incomingCtx.state === "closed") return;
        const osc = incomingCtx.createOscillator();
        const gainNode = incomingCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(incomingCtx.destination);
        osc.type = "triangle";

        // Standard electronic dual-ring: 850Hz & 650Hz
        const now = incomingCtx.currentTime;
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.setValueAtTime(650, now + 0.15);
        osc.frequency.setValueAtTime(850, now + 0.3);
        osc.frequency.setValueAtTime(650, now + 0.45);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gainNode.gain.setValueAtTime(0.12, now + 0.6);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

        osc.start();
        osc.stop(now + 0.95);
      };

      playIncomingTone();
      incomingInterval = setInterval(playIncomingTone, 1800);
    } catch (err) {
      console.error("Failed to generate incoming ringtone:", err);
    }
  },

  stopIncoming: () => {
    if (incomingInterval) {
      clearInterval(incomingInterval);
      incomingInterval = null;
    }
    if (incomingCtx) {
      incomingCtx.close().catch(() => { });
      incomingCtx = null;
    }
  },

  startOutgoing: () => {
    if (outgoingCtx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      outgoingCtx = new AudioContextClass();

      const playOutgoingTone = () => {
        if (!outgoingCtx || outgoingCtx.state === "closed") return;
        const osc1 = outgoingCtx.createOscillator();
        const osc2 = outgoingCtx.createOscillator();
        const gainNode = outgoingCtx.createGain();

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(outgoingCtx.destination);

        // Standard ringback tone: 440Hz & 480Hz
        const now = outgoingCtx.currentTime;
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1);
        gainNode.gain.setValueAtTime(0.15, now + 1.2);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

        osc1.start();
        osc2.start();
        osc1.stop(now + 1.6);
        osc2.stop(now + 1.6);
      };

      playOutgoingTone();
      outgoingInterval = setInterval(playOutgoingTone, 3000);
    } catch (err) {
      console.error("Failed to generate outgoing ringtone:", err);
    }
  },

  stopOutgoing: () => {
    if (outgoingInterval) {
      clearInterval(outgoingInterval);
      outgoingInterval = null;
    }
    if (outgoingCtx) {
      outgoingCtx.close().catch(() => { });
      outgoingCtx = null;
    }
  },

  stopAll: () => {
    ringtoneManager.stopIncoming();
    ringtoneManager.stopOutgoing();
  }
};
