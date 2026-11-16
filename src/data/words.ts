export interface Word {
  id: string;
  word: string;
  emoji: string;
  category: string;
}

export const words: readonly Word[] = [
  { id: 'cat', word: 'кошка', emoji: '🐱', category: 'Животные' },
  { id: 'dog', word: 'собака', emoji: '🐶', category: 'Животные' },
  { id: 'cow', word: 'корова', emoji: '🐮', category: 'Животные' },
  { id: 'fox', word: 'лиса', emoji: '🦊', category: 'Животные' },
  { id: 'hare', word: 'заяц', emoji: '🐰', category: 'Животные' },
  { id: 'ball', word: 'мяч', emoji: '⚽', category: 'Предметы' },
  { id: 'book', word: 'книга', emoji: '📚', category: 'Предметы' },
  { id: 'chair', word: 'стул', emoji: '🪑', category: 'Предметы' },
  { id: 'cup', word: 'чашка', emoji: '☕', category: 'Предметы' },
  { id: 'car', word: 'машина', emoji: '🚗', category: 'Предметы' },
  { id: 'apple', word: 'яблоко', emoji: '🍎', category: 'Еда' },
  { id: 'banana', word: 'банан', emoji: '🍌', category: 'Еда' },
  { id: 'pear', word: 'груша', emoji: '🍐', category: 'Еда' },
  { id: 'bread', word: 'хлеб', emoji: '🍞', category: 'Еда' },
  { id: 'cheese', word: 'сыр', emoji: '🧀', category: 'Еда' },
  { id: 'sun', word: 'солнце', emoji: '☀️', category: 'Природа' },
  { id: 'rain', word: 'дождь', emoji: '🌧️', category: 'Природа' },
  { id: 'tree', word: 'дерево', emoji: '🌳', category: 'Природа' },
  { id: 'flower', word: 'цветок', emoji: '🌸', category: 'Природа' },
  { id: 'snow', word: 'снег', emoji: '❄️', category: 'Природа' },
];
