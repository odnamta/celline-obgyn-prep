/**
 * SM-2 Spaced Repetition Algorithm Implementation
 * 
 * This module implements the SM-2 algorithm for calculating optimal review intervals
 * based on user performance ratings.
 */

export interface SM2Input {
  interval: number;
  easeFactor: number;
  rating: 1 | 2 | 3 | 4;
}

export interface SM2Output {
  interval: number;
  easeFactor: number;
  nextReview: Date;
}

export interface CardState {
  interval: number;
  easeFactor: number;
  nextReview: Date;
}

/**
 * Calculates the next review date and updated card state based on SM-2 algorithm.
 * 
 * Rating meanings:
 * - 1 (Again): Complete failure, reset interval
 * - 2 (Hard): Correct but with difficulty
 * - 3 (Good): Correct with moderate effort
 * - 4 (Easy): Correct with no effort
 * 
 * @param input - The current card state and user rating
 * @returns The updated card state with new interval, ease factor, and next review date
 */
export function calculateNextReview(input: SM2Input): SM2Output {
  const { interval, easeFactor, rating } = input;
  const now = new Date();
  
  let newInterval: number;
  let newEaseFactor: number;
  
  switch (rating) {
    case 1: // Again - Reset interval, next review in 10 minutes
      newInterval = 0;
      newEaseFactor = Math.max(1.3, easeFactor - 0.2);
      return {
        interval: newInterval,
        easeFactor: newEaseFactor,
        nextReview: new Date(now.getTime() + 10 * 60 * 1000), // 10 minutes from now
      };
      
    case 2: // Hard - Multiply interval by 1.2, decrease ease factor
      newInterval = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
      newEaseFactor = Math.max(1.3, easeFactor - 0.15);
      break;
      
    case 3: // Good - Multiply interval by ease factor
      newInterval = interval === 0 ? 1 : Math.round(interval * easeFactor);
      newEaseFactor = easeFactor;
      break;
      
    case 4: // Easy - Multiply interval by (ease factor + 0.15), increase ease factor
      newInterval = interval === 0 ? 4 : Math.round(interval * (easeFactor + 0.15));
      newEaseFactor = easeFactor + 0.15;
      break;
  }
  
  // Calculate next review date (interval in days)
  const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
  
  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    nextReview,
  };
}

/**
 * Serializes card state to JSON string for storage/transmission.
 * 
 * @param card - The card state to serialize
 * @returns JSON string representation of the card state
 */
export function serializeCardState(card: CardState): string {
  return JSON.stringify({
    interval: card.interval,
    easeFactor: card.easeFactor,
    nextReview: card.nextReview.toISOString(),
  });
}

/**
 * Deserializes card state from JSON string.
 * 
 * @param json - JSON string representation of card state
 * @returns The deserialized card state object
 */
export function deserializeCardState(json: string): CardState {
  const parsed = JSON.parse(json);
  return {
    interval: parsed.interval,
    easeFactor: parsed.easeFactor,
    nextReview: new Date(parsed.nextReview),
  };
}
