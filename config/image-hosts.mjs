export const IMAGE_HOSTS = ['res.cloudinary.com', 'harglimpublish-backend.onrender.com', 'lh3.googleusercontent.com'];

export function canOptimizeImage(source) {
  if (typeof source !== 'string') return true; // Imported local static images.
  if (source.startsWith('/') && !source.startsWith('//')) return true;
  try {
    const url = new URL(source);
    return url.protocol === 'https:' && !url.port && !url.username && !url.password && IMAGE_HOSTS.includes(url.hostname);
  } catch { return false; }
}
