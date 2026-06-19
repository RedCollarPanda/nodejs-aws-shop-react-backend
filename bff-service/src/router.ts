export interface ParsedRecipient {
  recipient: string;
  remainder: string;
}

/**
 * Splits "/recipient/rest/of/path" into the recipient key and the
 * remaining path that should be forwarded to the recipient service as-is.
 */
export function parseRecipient(pathname: string): ParsedRecipient {
  const trimmed = pathname.replace(/^\/+/, "");
  const slashIndex = trimmed.indexOf("/");

  if (slashIndex === -1) {
    return { recipient: trimmed, remainder: "/" };
  }

  return {
    recipient: trimmed.slice(0, slashIndex),
    remainder: trimmed.slice(slashIndex),
  };
}

export function resolveRecipientUrl(
  recipients: Record<string, string>,
  recipient: string
): string | undefined {
  return recipients[recipient];
}
