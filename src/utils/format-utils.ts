/**
 * Cleans and formats AI responses for better readability
 * - Removes source indicators and unnecessary formatting
 * - Removes excessive hashtags and asterisks
 * - Fixes bullet points and spacing
 * - Ensures consistent, professional formatting
 */
export function cleanResponse(text: string): string {
  if (!text) return "";

  // Remove source indicators like [6:0*extracted_pdf_text.txt] or 【6: 0†extracted_pdf_tables. txt】
  let cleaned = text.replace(/\[\d+:\d+\*[^\]]+\]/g, "");
  cleaned = cleaned.replace(/【\d+:\s*\d+†[^】]+】/g, "");
  cleaned = cleaned.replace(/\(\d+:\s*\d+[†\*][^)]+\)/g, "");

  // Remove any remaining source references with different formats
  cleaned = cleaned.replace(/\[\d+:[^\]]+\]/g, "");
  cleaned = cleaned.replace(/【[^】]+】/g, "");

  // Remove excessive hashtags at the beginning of lines (but preserve **bold** formatting)
  cleaned = cleaned.replace(/^\s*#{1,6}\s*/gm, "");

  // Remove excessive asterisks that aren't part of **bold** formatting
  // Keep **text** but remove standalone * or *** patterns
  cleaned = cleaned.replace(/(?<!\*)\*{1}(?!\*)/g, ""); // Remove single asterisks
  cleaned = cleaned.replace(/\*{3,}/g, ""); // Remove 3+ consecutive asterisks

  // Fix bullet points - convert various formats to clean bullet points
  cleaned = cleaned.replace(/^\s*[-*•]\s*/gm, "• ");

  // Fix numbered lists
  cleaned = cleaned.replace(/^\s*(\d+)\.\s*/gm, "$1. ");

  // Ensure proper spacing after periods, commas, etc.
  cleaned = cleaned.replace(/([.,:;!?])(?=[^\s])/g, "$1 ");

  // Fix multiple consecutive line breaks (more than 2)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Ensure proper spacing around **bold** text
  cleaned = cleaned.replace(/(\*\*[^*]+\*\*)(?=[a-zA-Z])/g, "$1 ");
  cleaned = cleaned.replace(/([a-zA-Z])(\*\*[^*]+\*\*)/g, "$1 $2");

  // Remove trailing periods after source references
  cleaned = cleaned.replace(/\s*\.\s*$/gm, "");

  // Clean up any multiple spaces that might have been created
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ");

  // Ensure consistent line spacing - add space after colons when followed by text
  cleaned = cleaned.replace(/:(?=[a-zA-Z])/g, ": ");

  // Trim extra whitespace from each line and the entire text
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  return cleaned;
}
