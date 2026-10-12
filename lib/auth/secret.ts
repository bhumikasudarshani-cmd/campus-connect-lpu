const PLACEHOLDERS = ['generate_a_random_32_character_secret_here'];

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || PLACEHOLDERS.includes(secret)) {
    throw new Error(
      'JWT_SECRET must be set to a random string of at least 32 characters'
    );
  }
  return new TextEncoder().encode(secret);
}
