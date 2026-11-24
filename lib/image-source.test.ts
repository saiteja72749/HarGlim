import { expect, it } from 'vitest';
import { canOptimizeImage } from '@/config/image-hosts.mjs';
it('restricts the server image proxy while allowing local assets', () => {
  expect(canOptimizeImage('/logo.png')).toBe(true);
  expect(canOptimizeImage('https://res.cloudinary.com/account/image/upload/cover.png')).toBe(true);
  for (const src of ['https://publisher.example.test/cover.jpg', 'http://res.cloudinary.com/cover.png', 'https://private@res.cloudinary.com/cover.png', '//unknown.test/cover.png']) expect(canOptimizeImage(src)).toBe(false);
});
