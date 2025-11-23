/**
 * Parses a URL and extracts the page title
 * Uses server-side fetch with timeout
 */

const FETCH_TIMEOUT_MS = 5000;

/**
 * Fetches a URL and extracts the title from HTML
 * @param url - The URL to parse
 * @returns The extracted title or null if parsing fails
 */
export async function parseUrlTitle(url: string): Promise<string | null> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return null;
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'GiftRegistry/1.0 (URL Parser)',
          'Accept': 'text/html',
        },
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      // Only process HTML content
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return null;
      }

      // Read limited amount of HTML (first 50KB should contain title)
      const reader = response.body?.getReader();
      if (!reader) return null;

      let html = '';
      const decoder = new TextDecoder();
      const maxBytes = 50 * 1024; // 50KB

      while (html.length < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });

        // Early exit if we've found a title tag
        if (html.includes('</title>') || html.includes('</head>')) {
          break;
        }
      }

      reader.cancel();

      return extractTitle(html);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Extracts title from HTML content
 * Tries og:title first, then <title> tag
 */
function extractTitle(html: string): string | null {
  // Try og:title first
  const ogTitleMatch = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i
  );

  if (ogTitleMatch && ogTitleMatch[1]) {
    return decodeHtmlEntities(ogTitleMatch[1].trim());
  }

  // Try twitter:title
  const twitterTitleMatch = html.match(
    /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:title["']/i
  );

  if (twitterTitleMatch && twitterTitleMatch[1]) {
    return decodeHtmlEntities(twitterTitleMatch[1].trim());
  }

  // Fall back to <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return decodeHtmlEntities(titleMatch[1].trim());
  }

  return null;
}

/**
 * Decodes common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10))
  );
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );

  return decoded;
}

export default { parseUrlTitle };
