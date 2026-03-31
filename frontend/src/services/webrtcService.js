import socketService from "./socketService";

class WebRTCService {
    peerConnection = null;
    dataChannel = null;
    onMessageCallback = null;
    onStatusChange = null;

    config = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
        ],
    };

    init(targetUserId, onMessage, onStatus) {
        this.onMessageCallback = onMessage;
        this.onStatusChange = onStatus;

        this.peerConnection = new RTCPeerConnection(this.config);

        // Setup Data Channel for messages
        this.dataChannel = this.peerConnection.createDataChannel("chat");
        this.setupDataChannel(this.dataChannel);

        // Handle receiving data channels (if we are the answerer)
        this.peerConnection.ondatachannel = (event) => {
            this.setupDataChannel(event.channel);
        };

        // ICE Candidate handling
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socketService.emit("ice-candidate", {
                    to: targetUserId,
                    candidate: event.candidate,
                });
            }
        };

        // Listen for signaling events from socket
        socketService.on("incoming-call", this.handleIncomingCall.bind(this));
        socketService.on("call-answered", this.handleCallAnswered.bind(this));
        socketService.on("ice-candidate", this.handleIceCandidate.bind(this));
    }

    setupDataChannel(channel) {
        channel.onopen = () => {
            if (this.onStatusChange) this.onStatusChange("connected");
        };
        channel.onclose = () => {
            if (this.onStatusChange) this.onStatusChange("disconnected");
        };
        channel.onmessage = (event) => {
            if (this.onMessageCallback) this.onMessageCallback(event.data);
        };
    }

    async initiateCall(targetUserId) {
        if (!this.peerConnection) return;
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        socketService.emit("call-user", { to: targetUserId, offer });
    }

    async handleIncomingCall({ from, offer }) {
        if (!this.peerConnection) return;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        socketService.emit("answer-call", { to: from, answer });
    }

    async handleCallAnswered({ answer }) {
        if (!this.peerConnection) return;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    async handleIceCandidate({ candidate }) {
        if (!this.peerConnection) return;
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }

    sendMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            this.dataChannel.send(message);
            return true;
        }
        return false;
    }

    cleanup() {
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        this.peerConnection = null;
        this.dataChannel = null;

        socketService.off("incoming-call", this.handleIncomingCall);
        socketService.off("call-answered", this.handleCallAnswered);
        socketService.off("ice-candidate", this.handleIceCandidate);

        if (this.onStatusChange) this.onStatusChange("disconnected");
    }
}

export default new WebRTCService();
