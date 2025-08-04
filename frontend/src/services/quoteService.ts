/**
 * Quote Selection Service
 * 
 * Provides intelligent quote selection based on upcoming session topics and categories.
 * Maps session context to appropriate inspirational quotes from the quote database.
 */

import quoteDatabase from '@/../../data/quote_db.json';

export interface Quote {
  quote: string;
  author: string;
  topic: string;
}

export class QuoteService {
  private quotes: Quote[];

  constructor() {
    this.quotes = quoteDatabase as Quote[];
  }

  /**
   * Get a contextual quote based on the upcoming session
   */
  getContextualQuote(nextWorkBlock?: { label: string; timeCategory: string } | null): Quote {
    if (!nextWorkBlock) {
      return this.getDefaultTranquilQuote();
    }

    // Extract topic from session context
    const topic = this.mapSessionToTopic(nextWorkBlock.label, nextWorkBlock.timeCategory);
    
    // Get quotes for the topic
    const topicQuotes = this.quotes.filter(quote => quote.topic === topic);
    
    if (topicQuotes.length === 0) {
      return this.getDefaultTranquilQuote();
    }

    // Return random quote from topic
    return topicQuotes[Math.floor(Math.random() * topicQuotes.length)];
  }

  /**
   * Map session label and category to quote topic
   * Only maps personal activities since tranquil screen is for off-hours
   */
  private mapSessionToTopic(label: string, timeCategory: string): string {
    // Normalize inputs with safety checks
    const normalizedLabel = (label || '').toLowerCase();
    const normalizedCategory = (timeCategory || '').toLowerCase();

    // Map by time category first (primary indicators for personal time)
    switch (normalizedCategory) {
      case 'meals':
        return 'Cooking & Eating';
      case 'health':
      case 'fitness':
        return 'Exercise & Fitness';
      case 'transit':
      case 'commute':
        return 'Commuting & Transit';
      case 'personal':
        // Check personal activity type from label
        if (normalizedLabel.includes('read') || normalizedLabel.includes('book')) {
          return 'Reading';
        }
        if (normalizedLabel.includes('cook') || normalizedLabel.includes('meal')) {
          return 'Cooking & Eating';
        }
        if (normalizedLabel.includes('workout') || normalizedLabel.includes('exercise')) {
          return 'Exercise & Fitness';
        }
        if (normalizedLabel.includes('commute') || normalizedLabel.includes('travel')) {
          return 'Commuting & Transit';
        }
        // Default personal time
        return 'Reading';
    }

    // Map by specific personal activities from label
    if (normalizedLabel.includes('meal') || 
        normalizedLabel.includes('lunch') || 
        normalizedLabel.includes('dinner') ||
        normalizedLabel.includes('breakfast') ||
        normalizedLabel.includes('cooking') ||
        normalizedLabel.includes('cook')) {
      return 'Cooking & Eating';
    }

    if (normalizedLabel.includes('workout') || 
        normalizedLabel.includes('exercise') || 
        normalizedLabel.includes('gym') ||
        normalizedLabel.includes('run') ||
        normalizedLabel.includes('fitness') ||
        normalizedLabel.includes('yoga') ||
        normalizedLabel.includes('walk')) {
      return 'Exercise & Fitness';
    }

    if (normalizedLabel.includes('commute') || 
        normalizedLabel.includes('travel') || 
        normalizedLabel.includes('drive') ||
        normalizedLabel.includes('bike') ||
        normalizedLabel.includes('transit')) {
      return 'Commuting & Transit';
    }

    if (normalizedLabel.includes('read') || 
        normalizedLabel.includes('book') || 
        normalizedLabel.includes('study') ||
        normalizedLabel.includes('learn')) {
      return 'Reading';
    }

    // Default to reading for personal time
    return 'Reading';
  }

  /**
   * Get a peaceful default quote for tranquil moments
   */
  private getDefaultTranquilQuote(): Quote {
    const tranquilQuotes = [
      {
        quote: "Sometimes the most productive thing you can do is relax.",
        author: "Mark Black",
        topic: "Rest"
      },
      {
        quote: "In stillness, the world resets.",
        author: "Unknown",
        topic: "Rest"
      },
      {
        quote: "Rest when you're weary. Refresh and renew yourself, your body, your mind, your spirit.",
        author: "Ralph Marston",
        topic: "Rest"
      }
    ];

    return tranquilQuotes[Math.floor(Math.random() * tranquilQuotes.length)];
  }

  /**
   * Get all available topics
   */
  getAvailableTopics(): string[] {
    return [...new Set(this.quotes.map(quote => quote.topic))];
  }

  /**
   * Get quotes by specific topic
   */
  getQuotesByTopic(topic: string): Quote[] {
    return this.quotes.filter(quote => quote.topic === topic);
  }
}

// Export singleton instance
export const quoteService = new QuoteService();