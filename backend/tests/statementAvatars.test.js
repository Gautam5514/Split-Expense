import { jest } from '@jest/globals';
import { loadStatementAvatars, statementPhotoUrl } from '../utils/statementAvatars.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6sAAAAABJRU5ErkJggg==', 'base64');

test('only supported HTTPS photo providers can be fetched', () => {
  for (const url of ['http://lh3.googleusercontent.com/a', 'https://localhost/a', 'https://res.cloudinary.com.evil.test/a', 'https://user:pass@lh3.googleusercontent.com/a', 'https://lh3.googleusercontent.com:8443/a', 'https://res.cloudinary.com/demo/raw/upload/file']) expect(statementPhotoUrl(url)).toBeNull();
  expect(statementPhotoUrl('https://res.cloudinary.com/demo/image/upload/photo.webp')).toContain('/image/upload/f_png,w_80,h_80,c_fill/');
});

test('embeds valid photos, refuses non-images and uses bounded no-redirect requests', async () => {
  const fetchImage = jest.fn().mockResolvedValueOnce(new Response(png, { headers: { 'content-type': 'image/png' } })).mockResolvedValueOnce(new Response('<html>', { headers: { 'content-type': 'text/html' } })).mockRejectedValueOnce(new Error('timeout'));
  const members = ['a', 'b', 'c'].map((userId) => ({ userId, photoURL: 'https://lh3.googleusercontent.com/photo' }));
  const images = await loadStatementAvatars(members, { fetchImage });
  expect(images.size).toBe(1);
  expect(images.get('a')).toEqual(png);
  expect(fetchImage).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal) }));
});

test('oversized and invalid image payloads fall back to initials', async () => {
  const fetchImage = jest.fn().mockResolvedValueOnce(new Response(Buffer.alloc(256 * 1024 + 1), { headers: { 'content-type': 'image/png' } })).mockResolvedValueOnce(new Response('not an image', { headers: { 'content-type': 'image/png' } }));
  const images = await loadStatementAvatars([{ userId: 'a', photoURL: 'https://lh3.googleusercontent.com/a' }, { userId: 'b', photoURL: 'https://lh3.googleusercontent.com/b' }], { fetchImage });
  expect(images.size).toBe(0);
});
