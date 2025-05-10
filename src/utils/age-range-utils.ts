/**
 * Utility functions for age range checking in insurance plans
 */

/**
 * Checks if a client's age falls within a specified age range
 * @param clientAge - The client's age
 * @param ageRange - The age range string (e.g., "30-44", "65+", "All Ages")
 * @returns boolean - Whether the client's age is within the range
 */
export function isAgeInRange(clientAge: number, ageRange: string): boolean {
  // Handle 'All Ages' case or empty/null age range
  if (!ageRange || ageRange === "All Ages") return true;

  // Parse age range in format '18-29', '30-44', '45-54', '55-64', '65+'
  if (ageRange.endsWith("+")) {
    // For ranges like '65+'
    const minAge = parseInt(ageRange.replace("+", ""));
    return clientAge >= minAge;
  } else if (ageRange.includes("-")) {
    // For ranges like '18-29'
    const [minAge, maxAge] = ageRange.split("-").map(Number);
    return clientAge >= minAge && clientAge <= maxAge;
  }

  return false; // If format is unrecognized
}
