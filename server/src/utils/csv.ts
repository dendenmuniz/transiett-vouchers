export const csvEscape = (val: unknown): string => {
  if (val === null || val === undefined) return ''
  const s = String(val)
  // if it contains quotation marks, commas or line breaks, 
  // surround it with quotation marks and double the inner quotation marks
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
