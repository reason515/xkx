/** Strip Telnet IAC negotiation so text stays valid UTF-8. */

const IAC = 255;
const DONT = 254;
const DO = 253;
const WONT = 252;
const WILL = 251;
const SB = 250;
const SE = 240;

/**
 * @param {Buffer} buf
 * @returns {{ text: Buffer, replies: Buffer[] }}
 */
export function stripTelnet(buf) {
  const out = [];
  const replies = [];
  let i = 0;

  while (i < buf.length) {
    if (buf[i] !== IAC) {
      out.push(buf[i]);
      i += 1;
      continue;
    }

    if (i + 1 >= buf.length) break;
    const cmd = buf[i + 1];

    // Escaped 0xFF
    if (cmd === IAC) {
      out.push(IAC);
      i += 2;
      continue;
    }

    // WILL / WONT / DO / DONT + option → reply with refuse
    if (
      (cmd === WILL || cmd === WONT || cmd === DO || cmd === DONT) &&
      i + 2 < buf.length
    ) {
      const opt = buf[i + 2];
      if (cmd === WILL) replies.push(Buffer.from([IAC, DONT, opt]));
      if (cmd === DO) replies.push(Buffer.from([IAC, WONT, opt]));
      i += 3;
      continue;
    }

    // Subnegotiation: IAC SB ... IAC SE
    if (cmd === SB) {
      i += 2;
      while (i + 1 < buf.length) {
        if (buf[i] === IAC && buf[i + 1] === SE) {
          i += 2;
          break;
        }
        i += 1;
      }
      continue;
    }

    // Other 2-byte IAC commands
    i += 2;
  }

  return { text: Buffer.from(out), replies };
}
