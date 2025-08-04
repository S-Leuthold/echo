/**
 * Contextual Quotes Service
 * 
 * Provides category-based inspirational quotes for the Theater Mode tranquil experience.
 * Emphasizes sustainable transport, mindful living, and personal growth.
 */

export interface Quote {
  text: string;
  author: string;
  categories: string[];
}

/**
 * Curated quote library organized by activity category
 * Bike-positive, sustainable, and mindful living focused
 */
const quotes: Quote[] = [
  // HEALTH & FITNESS
  {
    text: "The point is whether or not I improved over yesterday. In long-distance running the only opponent you have to beat is yourself, the way you used to be.",
    author: "Haruki Murakami",
    categories: ["HEALTH"]
  },
  {
    text: "Take care of your body. It's the only place you have to live.",
    author: "Jim Rohn",
    categories: ["HEALTH"]
  },
  {
    text: "Movement is medicine for creating change in a person's physical, emotional, and mental states.",
    author: "Carol Welch",
    categories: ["HEALTH"]
  },
  {
    text: "The groundwork for all happiness is good health.",
    author: "Leigh Hunt",
    categories: ["HEALTH"]
  },
  {
    text: "Strength does not come from physical capacity. It comes from an indomitable will.",
    author: "Mahatma Gandhi",
    categories: ["HEALTH"]
  },

  // MEALS & NUTRITION
  {
    text: "Respect for food is a respect for life, for who we are and what we do.",
    author: "Thomas Keller",
    categories: ["MEALS"]
  },
  {
    text: "Let food be thy medicine and medicine be thy food.",
    author: "Hippocrates",
    categories: ["MEALS"]
  },
  {
    text: "The act of putting into your mouth what the earth has grown is perhaps your most direct interaction with the earth.",
    author: "Frances Moore Lappé",
    categories: ["MEALS"]
  },
  {
    text: "One cannot think well, love well, sleep well, if one has not dined well.",
    author: "Virginia Woolf",
    categories: ["MEALS"]
  },
  {
    text: "Mindful eating is a way of eating that cultivates awareness of physical and emotional sensations while eating or in a food-related environment.",
    author: "Jan Chozen Bays",
    categories: ["MEALS"]
  },

  // PERSONAL TIME & REFLECTION
  {
    text: "The reading of all good books is like a conversation with the finest minds of past centuries.",
    author: "René Descartes",
    categories: ["PERSONAL"]
  },
  {
    text: "In the depth of winter, I finally learned that there was in me an invincible summer.",
    author: "Albert Camus",
    categories: ["PERSONAL"]
  },
  {
    text: "The unexamined life is not worth living.",
    author: "Socrates",
    categories: ["PERSONAL"]
  },
  {
    text: "Everything you need is inside you – you just need to access it.",
    author: "Buddha",
    categories: ["PERSONAL"]
  },
  {
    text: "The most important relationship in your life is the relationship you have with yourself.",
    author: "Diane von Furstenberg",
    categories: ["PERSONAL"]
  },
  {
    text: "Silence is not empty, it is full of answers.",
    author: "Unknown",
    categories: ["PERSONAL"]
  },

  // TRANSIT & CYCLING (Bike-positive approach!)
  {
    text: "Life is like riding a bicycle. To keep your balance, you must keep moving.",
    author: "Albert Einstein",
    categories: ["TRANSIT"]
  },
  {
    text: "It is by riding a bicycle that you learn the contours of a country best, since you have to sweat up the hills and coast down them.",
    author: "Ernest Hemingway",
    categories: ["TRANSIT"]
  },
  {
    text: "The bicycle is a curious vehicle. Its passenger is its engine.",
    author: "John Howard",
    categories: ["TRANSIT"]
  },
  {
    text: "When I see an adult on a bicycle, I do not despair for the future of the human race.",
    author: "H.G. Wells",
    categories: ["TRANSIT"]
  },
  {
    text: "Every time I see an adult on a bicycle, I no longer despair for the future of the human race.",
    author: "H.G. Wells",
    categories: ["TRANSIT"]
  },
  {
    text: "The journey is the destination.",
    author: "Dan Eldon",
    categories: ["TRANSIT"]
  },
  {
    text: "I have two doctors, my left leg and my right.",
    author: "G.M. Trevelyan",
    categories: ["TRANSIT", "HEALTH"]
  },

  // REST & GENERAL TRANQUILITY
  {
    text: "Rest when you're weary. Refresh and renew yourself, your body, your mind, your spirit.",
    author: "Ralph Marston",
    categories: ["REST", "PERSONAL"]
  },
  {
    text: "Sometimes the most productive thing you can do is relax.",
    author: "Mark Black",
    categories: ["REST"]
  },
  {
    text: "Take rest; a field that has rested gives a bountiful crop.",
    author: "Ovid",
    categories: ["REST"]
  },
  {
    text: "Nature does not hurry, yet everything is accomplished.",
    author: "Lao Tzu",
    categories: ["REST", "PERSONAL"]
  },
  {
    text: "Peace comes from within. Do not seek it without.",
    author: "Buddha",
    categories: ["REST", "PERSONAL"]
  }
];

/**
 * Get a contextual quote based on the current block category
 * @param category - The time category of the current block
 * @param seed - Optional seed for deterministic selection (e.g., block ID)
 * @returns A selected quote matching the category
 */
export const getContextualQuote = (category: string, seed?: string): Quote => {
  // Normalize category for matching
  const normalizedCategory = category.toUpperCase();
  
  // Find quotes that match the category
  const matchingQuotes = quotes.filter(quote => 
    quote.categories.includes(normalizedCategory)
  );
  
  // If we have matching quotes, return a deterministic one based on seed
  if (matchingQuotes.length > 0) {
    const index = seed 
      ? Math.abs(hashString(seed)) % matchingQuotes.length
      : Math.floor(Math.random() * matchingQuotes.length);
    return matchingQuotes[index];
  }
  
  // Fallback to general personal/rest quotes if no exact match
  const fallbackQuotes = quotes.filter(quote => 
    quote.categories.includes("PERSONAL") || quote.categories.includes("REST")
  );
  
  if (fallbackQuotes.length > 0) {
    const index = seed 
      ? Math.abs(hashString(seed)) % fallbackQuotes.length
      : Math.floor(Math.random() * fallbackQuotes.length);
    return fallbackQuotes[index];
  }
  
  // Ultimate fallback quote
  return {
    text: "This moment is your life.",
    author: "Omar Khayyam",
    categories: ["PERSONAL"]
  };
};

/**
 * Simple hash function for deterministic quote selection
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Get all quotes for a specific category (useful for testing/debugging)
 * @param category - The category to filter by
 * @returns Array of quotes matching the category
 */
export const getQuotesByCategory = (category: string): Quote[] => {
  const normalizedCategory = category.toUpperCase();
  return quotes.filter(quote => quote.categories.includes(normalizedCategory));
};

/**
 * Get a random quote from the entire library
 * @returns A randomly selected quote
 */
export const getRandomQuote = (): Quote => {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
};

/**
 * Development helper to see quote distribution across categories
 */
export const getQuoteDistribution = (): Record<string, number> => {
  const distribution: Record<string, number> = {};
  
  quotes.forEach(quote => {
    quote.categories.forEach(category => {
      distribution[category] = (distribution[category] || 0) + 1;
    });
  });
  
  return distribution;
};

// Export the full quote library for potential future use
export { quotes as quoteLibrary };