import { hebrewTranslations } from '../locales/he';

const recentGreetings: Set<number> = new Set();
export const maxRecentGreetings = 8; // Number of recent greetings to track

const hoursLeft = 24 - new Date().getHours();

const greetingsText: string[] = hebrewTranslations.greetings;

/**
 * Returns a random greeting message to inspire productivity.
 * @returns {string} A random greeting message with optional emoji code.
 */
export const getRandomGreeting = (): string => {
  // Function to get a new greeting that hasn't been used recently
  const getUniqueGreeting = (): string => {
    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * greetingsText.length);
    } while (recentGreetings.has(randomIndex));

    // Update recent greetings
    recentGreetings.add(randomIndex);
    if (recentGreetings.size > maxRecentGreetings) {
      const firstEntry = Array.from(recentGreetings).shift();
      if (firstEntry !== undefined) {
        recentGreetings.delete(firstEntry);
      }
    }

    return greetingsText[randomIndex];
  };

  return getUniqueGreeting();
};