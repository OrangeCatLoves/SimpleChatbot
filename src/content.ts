export type CodeEntry = { text: string; image?: string };
export type QA = { key: string; question: string; answer: string };

export const QUESTIONS: QA[] = [
  { key: 'A', question: 'Question A full text...', answer: 'Answer A...' },
  { key: 'B', question: 'Question B full text...', answer: 'Answer B...' },
  { key: 'C', question: 'Question C full text...', answer: 'Answer C...' },
  { key: 'D', question: 'Question D full text...', answer: 'Answer D...' },
  { key: 'E', question: 'Question E full text...', answer: 'Answer E...' },
  { key: 'F', question: 'Question F full text...', answer: 'Answer F...' },
  { key: 'G', question: 'Question G full text...', answer: 'Answer G...' },
  { key: 'H', question: 'Question H full text...', answer: 'Answer H...' },
  { key: 'I', question: 'Question I full text...', answer: 'Answer I...' },
  { key: 'J', question: 'Question J full text...', answer: 'Answer J...' }
];

export const CODES: Record<string, CodeEntry> = {
  '#1RDT': { text: 'Description: Grainy picture of a man and woman caught arguing outside the Golden Mile movie theatre.\n\nDate: 15 June 1955', image: 'https://imgur.com/a/LqtR9ec' },
  '#2IJG': { text: 'Description: A chauffeur opening the car door for his lady boss.\n\nDate: 15 May 1955', image: 'https://imgur.com/QN4ygOJ' },
  "#3XGM": { text: 'Description: Man arguing with woman.\n\nDate: 27 June 1955', image: 'https://imgur.com/R2FSWa6' },
  '#4FPB': { text: 'Media file is corrupted.\n\nDescription: Blurry CCTV footage of a silhouette dragging corpse away.\n\nDate: 27 June 1955\n\nTime: 12.47 AM' },
  '#5DAK': { text: 'Description: Xuan Liu the movie actress, spotted walking on the streets in public.\n\nDate: 10 May 1955', image: 'https://imgur.com/5Elg0Hw' },
};
