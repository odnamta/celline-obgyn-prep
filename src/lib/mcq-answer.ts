/**
 * MCQ Answer Logic
 * 
 * Pure functions for determining MCQ answer correctness and SRS rating mapping.
 * Requirements: 2.4, 2.5
 */

export interface MCQAnswerInput {
  selectedIndex: number
  correctIndex: number
}

export interface MCQAnswerResult {
  isCorrect: boolean
  srsRating: 1 | 3
}

/**
 * Determines if an MCQ answer is correct and maps to the appropriate SRS rating.
 * 
 * Mapping rules (Requirements 2.4, 2.5):
 * - Correct answer (selectedIndex === correctIndex) → SRS rating 3 (Good)
 * - Incorrect answer (selectedIndex !== correctIndex) → SRS rating 1 (Again)
 * 
 * @param input - The selected and correct indices
 * @returns The correctness result and corresponding SRS rating
 */
export function determineMCQAnswer(input: MCQAnswerInput): MCQAnswerResult {
  const isCorrect = input.selectedIndex === input.correctIndex
  const srsRating: 1 | 3 = isCorrect ? 3 : 1
  
  return {
    isCorrect,
    srsRating,
  }
}
