export const INSTALLATION_PHOTOS: string[] = [
  "/testimonials/r1.jpg",
  "/testimonials/r1-1.jpg",
  ...Array.from({ length: 15 }, (_, i) => `/testimonials/install-${i + 1}.jpg`),
];
