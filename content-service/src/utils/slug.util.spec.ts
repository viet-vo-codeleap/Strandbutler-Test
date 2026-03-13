import {
  generateSlug,
  generateShortId,
  removeDiacritics,
  extractTitleFromSlug,
  isValidSlug,
} from './slug.util';

describe('Slug Utility Functions', () => {
  describe('generateShortId', () => {
    it('should generate a random ID with default length of 8', () => {
      const id = generateShortId();
      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate a random ID with custom length', () => {
      const id = generateShortId(12);
      expect(id).toHaveLength(12);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate different IDs on multiple calls', () => {
      const id1 = generateShortId();
      const id2 = generateShortId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('removeDiacritics', () => {
    it('should remove Vietnamese diacritics from lowercase letters', () => {
      expect(removeDiacritics('mùa hè')).toBe('mua he');
      expect(removeDiacritics('tiếng việt')).toBe('tieng viet');
      expect(removeDiacritics('đường')).toBe('duong');
    });

    it('should remove Vietnamese diacritics from uppercase letters', () => {
      expect(removeDiacritics('MÙA HÈ')).toBe('MUA HE');
      expect(removeDiacritics('TIẾNG VIỆT')).toBe('TIENG VIET');
      expect(removeDiacritics('ĐƯỜNG')).toBe('DUONG');
    });

    it('should handle mixed case with diacritics', () => {
      expect(removeDiacritics('Mùa Hè Hiraku Chết')).toBe('Mua He Hiraku Chet');
    });

    it('should leave non-diacritic characters unchanged', () => {
      expect(removeDiacritics('Breaking Bad')).toBe('Breaking Bad');
      expect(removeDiacritics('The Matrix 123')).toBe('The Matrix 123');
    });

    it('should handle empty string', () => {
      expect(removeDiacritics('')).toBe('');
    });

    it('should handle all Vietnamese vowels with tones', () => {
      expect(removeDiacritics('à á ạ ả ã â ầ ấ ậ ẩ ẫ ă ằ ắ ặ ẳ ẵ')).toBe('a a a a a a a a a a a a a a a a a');
      expect(removeDiacritics('è é ẹ ẻ ẽ ê ề ế ệ ể ễ')).toBe('e e e e e e e e e e e');
      expect(removeDiacritics('ì í ị ỉ ĩ')).toBe('i i i i i');
      expect(removeDiacritics('ò ó ọ ỏ õ ô ồ ố ộ ổ ỗ ơ ờ ớ ợ ở ỡ')).toBe('o o o o o o o o o o o o o o o o o');
      expect(removeDiacritics('ù ú ụ ủ ũ ư ừ ứ ự ử ữ')).toBe('u u u u u u u u u u u');
      expect(removeDiacritics('ỳ ý ỵ ỷ ỹ')).toBe('y y y y y');
    });
  });

  describe('generateSlug', () => {
    it('should convert title to lowercase slug with hyphens', () => {
      const slug = generateSlug('Breaking Bad', false);
      expect(slug).toBe('breaking-bad');
    });

    it('should remove Vietnamese diacritics', () => {
      const slug = generateSlug('Mùa Hè Hiraku Chết', false);
      expect(slug).toBe('mua-he-hiraku-chet');
    });

    it('should append short ID when withId is true (default)', () => {
      const slug = generateSlug('Breaking Bad');
      expect(slug).toMatch(/^breaking-bad\.[A-Za-z0-9]{8}$/);
    });

    it('should not append short ID when withId is false', () => {
      const slug = generateSlug('Breaking Bad', false);
      expect(slug).toBe('breaking-bad');
      expect(slug).not.toContain('.');
    });

    it('should replace special characters with hyphens', () => {
      const slug = generateSlug('The Lord of the Rings: The Fellowship', false);
      expect(slug).toBe('the-lord-of-the-rings-the-fellowship');
    });

    it('should remove consecutive hyphens', () => {
      const slug = generateSlug('Title  with   multiple    spaces', false);
      expect(slug).toBe('title-with-multiple-spaces');
    });

    it('should trim hyphens from start and end', () => {
      const slug = generateSlug('  Title with spaces  ', false);
      expect(slug).toBe('title-with-spaces');
    });

    it('should handle numbers in title', () => {
      const slug = generateSlug('2001: A Space Odyssey', false);
      expect(slug).toBe('2001-a-space-odyssey');
    });

    it('should handle complex Vietnamese title', () => {
      const slug = generateSlug('Thám Tử Lừng Danh Conan: Những Giây Phút Cuối Cùng Đến Thiên Đường', false);
      expect(slug).toBe('tham-tu-lung-danh-conan-nhung-giay-phut-cuoi-cung-den-thien-duong');
    });

    it('should handle title with apostrophes and quotes', () => {
      const slug = generateSlug("The Queen's Gambit", false);
      expect(slug).toBe('the-queen-s-gambit');
    });

    it('should handle empty or whitespace-only titles', () => {
      const slug = generateSlug('   ', false);
      expect(slug).toBe('');
    });

    it('should create unique slugs for same title', () => {
      const slug1 = generateSlug('Breaking Bad');
      const slug2 = generateSlug('Breaking Bad');
      expect(slug1).not.toBe(slug2);
      expect(slug1.startsWith('breaking-bad.')).toBe(true);
      expect(slug2.startsWith('breaking-bad.')).toBe(true);
    });
  });

  describe('extractTitleFromSlug', () => {
    it('should extract title portion from slug with ID', () => {
      expect(extractTitleFromSlug('breaking-bad.Xy9kLm2N')).toBe('breaking-bad');
      expect(extractTitleFromSlug('mua-he-hikaru-chet.czwrSTe4')).toBe('mua-he-hikaru-chet');
    });

    it('should return slug as-is if no ID present', () => {
      expect(extractTitleFromSlug('breaking-bad')).toBe('breaking-bad');
      expect(extractTitleFromSlug('the-matrix')).toBe('the-matrix');
    });

    it('should handle slug with multiple dots', () => {
      expect(extractTitleFromSlug('mr.robot.abc123')).toBe('mr.robot');
    });

    it('should handle empty string', () => {
      expect(extractTitleFromSlug('')).toBe('');
    });
  });

  describe('isValidSlug', () => {
    it('should return true for valid slug without ID', () => {
      expect(isValidSlug('breaking-bad')).toBe(true);
      expect(isValidSlug('the-matrix')).toBe(true);
      expect(isValidSlug('mua-he-hikaru-chet')).toBe(true);
    });

    it('should return true for valid slug with ID', () => {
      expect(isValidSlug('breaking-bad.Xy9kLm2N')).toBe(true);
      expect(isValidSlug('mua-he-hikaru-chet.czwrSTe4')).toBe(true);
    });

    it('should return false for slug with spaces', () => {
      expect(isValidSlug('breaking bad')).toBe(false);
      expect(isValidSlug('the matrix.abc123')).toBe(false);
    });

    it('should return false for slug with uppercase (in title part)', () => {
      expect(isValidSlug('Breaking-Bad')).toBe(false);
      expect(isValidSlug('The-Matrix.abc123')).toBe(false);
    });

    it('should return false for slug with special characters', () => {
      expect(isValidSlug('breaking-bad!')).toBe(false);
      expect(isValidSlug('the-matrix@home')).toBe(false);
      expect(isValidSlug('title_with_underscores')).toBe(false);
    });

    it('should return false for slug with Vietnamese diacritics', () => {
      expect(isValidSlug('mùa-hè')).toBe(false);
    });

    it('should return false for slug starting with hyphen', () => {
      expect(isValidSlug('-breaking-bad')).toBe(false);
    });

    it('should return false for slug ending with hyphen', () => {
      expect(isValidSlug('breaking-bad-')).toBe(false);
    });

    it('should return false for slug with consecutive hyphens', () => {
      expect(isValidSlug('breaking--bad')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidSlug('')).toBe(false);
    });

    it('should return true for slug with numbers', () => {
      expect(isValidSlug('2001-a-space-odyssey')).toBe(true);
      expect(isValidSlug('terminator-2.abc123')).toBe(true);
    });

    it('should allow uppercase letters in ID part', () => {
      expect(isValidSlug('breaking-bad.XyZ123')).toBe(true);
      expect(isValidSlug('the-matrix.ABC123def')).toBe(true);
    });
  });

  describe('Real-world examples', () => {
    it('should handle Breaking Bad series slug', () => {
      const slug = generateSlug('Breaking Bad');
      expect(slug).toMatch(/^breaking-bad\.[A-Za-z0-9]{8}$/);
      expect(isValidSlug(slug)).toBe(true);
      expect(extractTitleFromSlug(slug)).toBe('breaking-bad');
    });

    it('should handle Vietnamese anime title', () => {
      const slug = generateSlug('Mùa Hè Hiraku Chết');
      expect(slug).toMatch(/^mua-he-hiraku-chet\.[A-Za-z0-9]{8}$/);
      expect(isValidSlug(slug)).toBe(true);
      expect(extractTitleFromSlug(slug)).toBe('mua-he-hiraku-chet');
    });

    it('should handle Harry Potter movie title', () => {
      const slug = generateSlug("Harry Potter and the Philosopher's Stone");
      expect(slug).toMatch(/^harry-potter-and-the-philosopher-s-stone\.[A-Za-z0-9]{8}$/);
      expect(isValidSlug(slug)).toBe(true);
      expect(extractTitleFromSlug(slug)).toBe('harry-potter-and-the-philosopher-s-stone');
    });

    it('should handle long Vietnamese title', () => {
      const title = 'Thám Tử Lừng Danh Conan: Những Giây Phút Cuối Cùng Đến Thiên Đường';
      const slug = generateSlug(title);
      const expectedTitle = 'tham-tu-lung-danh-conan-nhung-giay-phut-cuoi-cung-den-thien-duong';

      expect(slug).toMatch(new RegExp(`^${expectedTitle}\\.[A-Za-z0-9]{8}$`));
      expect(isValidSlug(slug)).toBe(true);
      expect(extractTitleFromSlug(slug)).toBe(expectedTitle);
    });

    it('should create URL-compatible slugs', () => {
      const titles = [
        'Breaking Bad',
        'Mùa Hè Hiraku Chết',
        'Game of Thrones',
        'Người Nhện: Không Còn Nhà',
        'The Lord of the Rings: The Return of the King',
      ];

      titles.forEach((title) => {
        const slug = generateSlug(title);
        expect(isValidSlug(slug)).toBe(true);

        // Ensure it can be used in URLs
        const url = `https://flixzone.com/watch/${slug}?ss=1&ep=1`;
        expect(() => new URL(url)).not.toThrow();
      });
    });
  });
});
