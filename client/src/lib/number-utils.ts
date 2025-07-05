export function formatNumberWithCommas(value: string | number): string {
  const num = typeof value === "string" ? parseInt(value) : Math.floor(value);
  if (isNaN(num)) return "0";
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function parseNumberFromCommas(value: string): string {
  return value.replace(/,/g, '');
}

export function handleNumberInputChange(
  value: string,
  onChange: (value: string) => void
) {
  // Remove commas and non-numeric characters (no decimal points for whole dollars)
  const cleanValue = value.replace(/[^0-9]/g, '');
  onChange(cleanValue);
}