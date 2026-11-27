export const INSTALLATION_PHOTOS: string[] = [
  "/testimonials/r1.jpg",
  "/testimonials/r1-1.jpg",
  ...Array.from({ length: 25 }, (_, i) => `/testimonials/install-${i + 1}.jpg`),
  ...Array.from({ length: 176 }, (_, i) => `/testimonials/install-${i + 26}.webp`),
];
