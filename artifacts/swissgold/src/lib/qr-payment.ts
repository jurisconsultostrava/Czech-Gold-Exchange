export type Currency = "CZK" | "EUR";

const IBAN_CZK =
  (import.meta.env.VITE_BANK_IBAN_CZK as string | undefined) ??
  "CZ9520100000002202429939";
const IBAN_EUR =
  (import.meta.env.VITE_BANK_IBAN_EUR as string | undefined) ??
  "CZ0420100000002902077639";

export const BANK_BIC = "FIOBCZPPXXX";

/** Czech domestic account number + bank code for the CZK account. */
export const BANK_ACCOUNT_CZK = "2202429939";
export const BANK_CODE_CZK = "2010";

export function getIban(currency: Currency = "CZK"): string {
  return currency === "EUR" ? IBAN_EUR : IBAN_CZK;
}

/** Format an IBAN in groups of 4 for display, e.g. CZ04 2010 0000 ... */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Variabilní symbol derived from the order number. The Czech VS must be
 * numeric and at most 10 digits, so we strip non-digits and keep the last 10
 * (e.g. "SG-260629-1234" -> "2606291234").
 */
export function variableSymbolFromOrderNumber(orderNumber: string): string {
  const digits = orderNumber.replace(/\D/g, "").slice(-10);
  if (digits) return digits;
  // Fallback for malformed/non-numeric order numbers: last 10 digits of now.
  return String(Date.now()).slice(-10);
}

/**
 * paylibo QR-platba image URL for a CZK bank transfer.
 */
export function paylibCzkQrUrl(opts: {
  amountCzk: number;
  variableSymbol: string;
  message?: string;
}): string {
  const params = new URLSearchParams({
    accountNumber: BANK_ACCOUNT_CZK,
    bankCode: BANK_CODE_CZK,
    amount: String(Math.round(opts.amountCzk)),
    currency: "CZK",
    vs: opts.variableSymbol,
  });
  if (opts.message) params.set("message", opts.message);
  return `https://api.paylibo.com/paylibo/generator/czech/image?${params.toString()}`;
}
