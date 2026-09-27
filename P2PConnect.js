// Extension Name: P2P Connect - TurboWarp
// Description: Adds blocks for a two-player WebRTC connection.
// By: @Flip264
// License: MIT
// STUN: stun.l.google.com:19302 (this is the public server that helps establish the connection)

// Stun server(s) may change depending on its availability

(function (Scratch) {
  'use strict';

  class PeerToPeer {
    constructor() {
      this.pc = null;
      this.channel = null;
      this.role = '';
      this.state = 'idle';
      this.error = '';
      this.queue = [];
      this.last = '';
      this.sent = 0;
      this.received = 0;
      this.generation = 0;
    }

    getInfo() {
      return {
        id: 'flip2p',
        name: 'P2P Connect',
        color1: '#3767A6',
        blocks: [
          {
            opcode: 'host',
            blockType: Scratch.BlockType.REPORTER,
            text: 'create host offer',
            disableMonitor: true
          },
          {
            opcode: 'join',
            blockType: Scratch.BlockType.REPORTER,
            text: 'join with offer [CODE] and get answer',
            arguments: {
              CODE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'paste offer here'
              }
            }
          },
          {
            opcode: 'accept',
            blockType: Scratch.BlockType.COMMAND,
            text: 'host accept answer [CODE]',
            arguments: {
              CODE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'paste answer here'
              }
            }
          },
          {
            opcode: 'send',
            blockType: Scratch.BlockType.COMMAND,
            text: 'send P2P [TEXT]',
            arguments: {
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'text'
              }
            }
          },
          {
            opcode: 'lastMessage',
            blockType: Scratch.BlockType.REPORTER,
            text: 'last received text'
          },
          {
            opcode: 'sentCount',
            blockType: Scratch.BlockType.REPORTER,
            text: 'messages sent'
          },
          {
            opcode: 'receivedCount',
            blockType: Scratch.BlockType.REPORTER,
            text: 'messages received'
          },
          {
            opcode: 'next',
            blockType: Scratch.BlockType.REPORTER,
            text: 'take next P2P message',
            disableMonitor: true
          },
          {
            opcode: 'count',
            blockType: Scratch.BlockType.REPORTER,
            text: 'unread P2P messages'
          },
          {
            opcode: 'connected',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'P2P connected?'
          },
          {
            opcode: 'status',
            blockType: Scratch.BlockType.REPORTER,
            text: 'P2P status'
          },
          {
            opcode: 'lastError',
            blockType: Scratch.BlockType.REPORTER,
            text: 'P2P error'
          },
          {
            opcode: 'disconnect',
            blockType: Scratch.BlockType.COMMAND,
            text: 'disconnect P2P'
          }
        ]
      };
    }

    _close() {
      const old = this.pc;
      this.pc = null;
      this.channel = null;
      this.generation++;
      if (old) old.close();
    }

    _fail(err) {
      this.error = err && err.message
        ? err.message
        : String(err);
      this.state = 'error';
      this._close();
    }

    _setup(role) {
      this._close();
      this.role = role;
      this.error = '';
      this.queue.length = 0;
      this.last = '';
      this.sent = 0;
      this.received = 0;
      this.state = 'connecting';

      if (typeof RTCPeerConnection === 'undefined') {
        throw new Error('WebRTC is unavailable in this browser.');
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          {urls: 'stun:stun.l.google.com:19302'}
        ]
      });

      this.pc = pc;
      const generation = this.generation;

      pc.onconnectionstatechange = () => {
        if (this.pc !== pc ||
            this.generation !== generation) return;

        if (pc.connectionState === 'failed' ||
            pc.connectionState === 'closed' ||
            pc.connectionState === 'disconnected') {
          if (this.state !== 'error') {
            this.state = 'disconnected';
          }
        }
      };

      pc.ondatachannel = event => {
        this._attach(event.channel, pc);
      };

      return pc;
    }

    _attach(channel, pc) {
      if (this.pc !== pc) {
        channel.close();
        return;
      }

      this.channel = channel;

      channel.onopen = () => {
        if (this.pc !== pc) return;
        this.state = 'connected';
      };

      channel.onmessage = event => {
        if (this.pc !== pc) return;

        this.last = String(event.data);
        this.queue.push(this.last);
        this.received++;

        if (this.queue.length > 1000) {
          this.queue.shift();
        }
      };

      channel.onclose = () => {
        if (this.pc !== pc || this.state === 'error') return;
        this.state = 'disconnected';
      };

      channel.onerror = () => {
        if (this.pc === pc) {
          this.error = 'Data channel error';
        }
      };
    }

    _decode(code, kind) {
      let value;

      try {
        value = JSON.parse(String(code).trim());
      } catch (_) {
        throw new Error(
          'Invalid ' + kind + ' code. Paste the full code.'
        );
      }

      if (!value ||
          value.type !== kind ||
          typeof value.sdp !== 'string' ||
          value.sdp.length > 1000000) {
        throw new Error('Invalid ' + kind + ' code.');
      }

      return value;
    }

    _gather(pc) {
      if (pc.iceGatheringState === 'complete') {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('ICE gathering timed out.'));
        }, 20000);

        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            cleanup();
            resolve();
          }
        };

        const cleanup = () => {
          clearTimeout(timeout);
          pc.removeEventListener(
            'icegatheringstatechange',
            check
          );
        };

        pc.addEventListener('icegatheringstatechange', check);
        check();
      });
    }

    async host() {
      try {
        const pc = this._setup('host');
        this._attach(pc.createDataChannel('game'), pc);

        await pc.setLocalDescription(await pc.createOffer());
        await this._gather(pc);

        if (this.pc !== pc) return '';

        this.state = 'waiting for answer';
        return JSON.stringify(pc.localDescription);
      } catch (err) {
        this._fail(err);
        return '';
      }
    }

    async join({CODE}) {
      try {
        const offer = this._decode(CODE, 'offer');
        const pc = this._setup('guest');

        await pc.setRemoteDescription(offer);
        await pc.setLocalDescription(await pc.createAnswer());
        await this._gather(pc);

        if (this.pc !== pc) return '';

        this.state = 'waiting for host';
        return JSON.stringify(pc.localDescription);
      } catch (err) {
        this._fail(err);
        return '';
      }
    }

    async accept({CODE}) {
      try {
        const answer = this._decode(CODE, 'answer');

        if (!this.pc ||
            this.role !== 'host' ||
            this.pc.signalingState !== 'have-local-offer') {
          throw new Error(
            'Create a host offer before accepting an answer.'
          );
        }

        await this.pc.setRemoteDescription(answer);
      } catch (err) {
        this._fail(err);
      }
    }

    send({TEXT}) {
      try {
        if (!this.connected()) {
          throw new Error('No open P2P connection.');
        }

        const data = String(TEXT);

        if (new TextEncoder().encode(data).length > 16384) {
          throw new Error('Message exceeds 16 KB.');
        }

        if (this.channel.bufferedAmount > 1048576) {
          throw new Error('Send buffer full. Try again shortly.');
        }

        this.channel.send(data);
        this.sent++;
        this.error = '';
      } catch (err) {
        this.error = err.message || String(err);
      }
    }

    sentCount() {
      return this.sent;
    }

    receivedCount() {
      return this.received;
    }

    lastMessage() {
      return this.last;
    }

    next() {
      return this.queue.shift() ?? '';
    }

    count() {
      return this.queue.length;
    }

    connected() {
      return !!this.channel &&
        this.channel.readyState === 'open';
    }

    status() {
      return this.state;
    }

    lastError() {
      return this.error;
    }

    disconnect() {
      this._close();
      this.state = 'disconnected';
    }
  }

  Scratch.extensions.register(new PeerToPeer());
})(Scratch);
