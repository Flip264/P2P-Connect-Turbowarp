@Flip264

# **P2P Connect Extension**

<img width="1253" height="663" alt="image" src="https://github.com/user-attachments/assets/874de8e3-3d23-4121-92fa-786e92ecab8e" />



P2P Connect is a custom TurboWarp extension that connects two running projects using a WebRTC data channel. Two computers exchange connection codes manually, then projects can send text messages between their computers.

## **How To Use**

1. Select the 'P2PConnect.js' file in the turbowarp custom extension tab.
2. Load the extension on both players’ computers.

## Connect

1. **Host:** Run `create host offer` once. Copy the entire result and send it privately to the guest.
2. **Guest:** Paste the offer into `join with offer [CODE] and get answer`. Run it and send the entire answer to the host.
3. **Host:** Paste the answer into `host accept answer [CODE]` and run it.
4. Check `P2P connected?` on both sides.

Creating a new host offer replaces the previous pending connection.

## Send and receive

Use `send P2P [TEXT]` to send text to the other player. On the receiving side, check `unread P2P messages`, then use `take next P2P message` to read one message.

For a quick test, send `hello` and check `last received text` on the other computer. The `messages sent` and `messages received` blocks help diagnose problems.

`take next P2P message` removes a message from the queue. Avoid running it as a monitor or in multiple scripts that might consume the message before your game handles it.

## Limits

- Connects **two players** at max.
- Sends **text**, up to **16,384 UTF-8 bytes per message**.
  (This is not a true limit, its coded so it doesnt stress out the connection as much)
- This extension does not automatically synchronize sprites or game state. Your project decides what messages to send and how to react.

## Networking and privacy

The extension currently uses `stun:stun.l.google.com:19302` to help players establish a direct connection. As Google operates this endpoint, its future availability is outside this project’s control. You can change the `iceServers` address in the JavaScript file.

No TURN relay is configured, so some network pairs may be unable to connect. Offer and answer codes can contain IP addresses and other connection details; share them privately with people you trust.

## Example Use Cases

P2P Connect can be useful for projects that needs online multiplay features.
Because its connection speed is heavily dependent on the two computers, its speed may vary.
While fast paced fighting games work, its inconsistent speed can affect the experience.
On the other hand, projects that are not pressured by time can benefit for using this extension.
Such as turn based games, as they don't need fast active communication every moment.
(cards, boardgames, etc)


## Troubleshooting

- **Connection fails:** Generate a fresh offer and answer, then check `P2P error` on both sides.
- **Connected but no message arrives:** Check whether `messages sent` increased on the sender and `messages received` increased on the receiver.
- **Message count increases but the queue is empty:** Another script or monitor may have run `take next P2P message`. Check `last received text`.

This is an experimental extension. 
