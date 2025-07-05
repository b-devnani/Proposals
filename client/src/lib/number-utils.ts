export function formatNumberWithCommas(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function parseNumberFromCommas(value: string): string {
  return value.replace(/,/g, '');
}

export function handleNumberInputChange(
  value: string,
  onChange: (value: string) => void
) {
  // Remove commas and non-numeric characters except decimal point
  const cleanValue = value.replace(/[^0-9.]/g, '');
  onChange(cleanValue);
}