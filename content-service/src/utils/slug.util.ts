/**
 * Utility functions for generating URL-friendly slugs
 *
 * Slug format: "title-in-lowercase-with-hyphens.shortId"
 * Example: "mua-he-hikaru-chet.czwrSTe4"
 */

/**
 * Generate a random short ID for slug uniqueness
 * @param length - Length of the ID (default: 8)
 * @returns Random alphanumeric string
 */
export function generateShortId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Remove Vietnamese diacritics from string
 * Converts: "Mùa Hè Hiraku Chết" → "Mua He Hiraku Chet"
 * @param str - String with diacritics
 * @returns String without diacritics
 */
export function removeDiacritics(str: string): string {
  const diacriticsMap: { [key: string]: string } = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D',
  };

  return str
    .split('')
    .map((char) => diacriticsMap[char] || char)
    .join('');
}

/**
 * Generate a URL-friendly slug from a title
 *
 * Process:
 * 1. Remove diacritics (Mùa Hè → Mua He)
 * 2. Convert to lowercase
 * 3. Replace spaces and special chars with hyphens
 * 4. Remove consecutive hyphens
 * 5. Trim hyphens from start/end
 * 6. Append short ID for uniqueness
 *
 * @param title - The title to slugify
 * @param withId - Whether to append a short ID (default: true)
 * @returns URL-friendly slug
 *
 * @example
 * generateSlug("Mùa Hè Hiraku Chết")
 * // Returns: "mua-he-hiraku-chet.czwrSTe4"
 *
 * @example
 * generateSlug("Breaking Bad")
 * // Returns: "breaking-bad.Xy9kLm2N"
 *
 * @example
 * generateSlug("The Lord of the Rings: The Fellowship of the Ring", false)
 * // Returns: "the-lord-of-the-rings-the-fellowship-of-the-ring"
 */
export function generateSlug(title: string, withId: boolean = true): string {
  // Step 1: Remove diacritics
  let slug = removeDiacritics(title);

  // Step 2: Convert to lowercase
  slug = slug.toLowerCase();

  // Step 3: Replace spaces and special characters with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, '-');

  // Step 4: Remove consecutive hyphens
  slug = slug.replace(/-+/g, '-');

  // Step 5: Trim hyphens from start and end
  slug = slug.replace(/^-+|-+$/g, '');

  // Step 6: Append short ID for uniqueness (optional)
  if (withId) {
    const shortId = generateShortId(8);
    slug = `${slug}.${shortId}`;
  }

  return slug;
}

/**
 * Extract the title portion from a slug (removes the .shortId part)
 * @param slug - Full slug with ID
 * @returns Title portion only
 *
 * @example
 * extractTitleFromSlug("breaking-bad.Xy9kLm2N")
 * // Returns: "breaking-bad"
 */
export function extractTitleFromSlug(slug: string): string {
  const lastDotIndex = slug.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return slug;
  }
  return slug.substring(0, lastDotIndex);
}

/**
 * Validate if a string is a valid slug format
 * @param slug - String to validate
 * @returns true if valid slug format
 *
 * @example
 * isValidSlug("breaking-bad.Xy9kLm2N") // true
 * isValidSlug("Breaking Bad") // false (has spaces, uppercase)
 * isValidSlug("breaking-bad") // true (without ID is still valid)
 */
export function isValidSlug(slug: string): boolean {
  // Slug should only contain lowercase letters, numbers, hyphens, and optionally a dot for the ID
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-zA-Z0-9]+)?$/;
  return slugRegex.test(slug);
}
