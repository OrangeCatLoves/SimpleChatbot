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
  '#04Y8': { text: 'Here is the message for 04Y8', image: 'https://via.placeholder.com/300' },
  '#01EE': { text: 'Message for 01EE' }
};
