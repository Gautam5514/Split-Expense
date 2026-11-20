// Only fetch the image providers already used for account photos. Never follow
// redirects or fetch arbitrary member-supplied hosts from the statement worker.
export function statementPhotoUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    const google = url.hostname === 'lh3.googleusercontent.com' || /^lh\d+\.googleusercontent\.com$/.test(url.hostname);
    if (url.hostname !== 'res.cloudinary.com' && !google) return null;
    if (url.hostname === 'res.cloudinary.com') {
      if (!url.pathname.includes('/image/upload/')) return null;
      url.pathname = url.pathname.replace('/image/upload/', '/image/upload/f_png,w_80,h_80,c_fill/');
    }
    return url.href;
  } catch { return null; }
}

export async function loadStatementAvatars(members, { fetchImage = fetch } = {}) {
  const images = new Map();
  const pending = [...members];
  const worker = async () => {
    while (pending.length) {
      const member = pending.shift();
      const url = statementPhotoUrl(member.photoURL);
      if (!url) continue;
      try {
        const response = await fetchImage(url, { redirect: 'error', signal: AbortSignal.timeout(2500) });
        if (!response.ok || !/^image\/(png|jpeg)(;|$)/i.test(response.headers.get('content-type') || '')) continue;
        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 256 * 1024) { await reader.cancel(); break; }
            chunks.push(Buffer.from(value));
          }
        } finally { reader.releaseLock(); }
        if (size > 0 && size <= 256 * 1024) {
          const content = Buffer.concat(chunks);
          const png = content.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
          const jpeg = content[0] === 255 && content[1] === 216 && content[2] === 255;
          if (png || jpeg) images.set(member.userId, content);
        }
      } catch { /* Missing/slow/unsupported photos fall back to initials. */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, members.length) }, worker));
  return images;
}
