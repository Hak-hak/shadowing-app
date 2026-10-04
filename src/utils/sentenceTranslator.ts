/**
 * Comprehensive English to Vietnamese translator tailored for
 * Vietnamese secondary school students (THCS lớp 6 - 9)
 */

import { WordToken } from '../types';

// Common conversational sentences & idioms with natural translations for THCS
const PRESET_TRANSLATIONS: [RegExp, string][] = [
  // Greetings & Intros
  [/^hello\b|^hi\b/i, 'Xin chào!'],
  [/^good morning,?\s*(teacher|class|everyone)?/i, 'Chào buổi sáng!'],
  [/^good afternoon,?\s*(teacher|class|everyone)?/i, 'Chào buổi chiều!'],
  [/^good evening\b/i, 'Chào buổi tối!'],
  [/^goodbye\b|^bye\b|^see you\b/i, 'Tạm biệt nhé!'],
  [/^see you (again|later|tomorrow|soon)\b/i, 'Hẹn sớm gặp lại bạn nhé!'],
  [/^how are you\b|^how are you doing\b/i, 'Dạo này bạn có khỏe không?'],
  [/^i('m| am) fine,?\s*thank(s| you)?\b/i, 'Mình khỏe, cảm ơn bạn nhiều nhé!'],
  [/^i am doing (well|great)\b/i, 'Mình vẫn rất khỏe, cảm ơn bạn!'],
  [/^nice to meet you\b|^pleased to meet you\b/i, 'Rất vui được làm quen với bạn!'],
  [/^what is your name\b|^what's your name\b/i, 'Tên của bạn là gì?'],
  [/^my name is\s+([a-zA-Z\s]+)/i, 'Tên của mình là $1.'],
  [/^how old are you\b/i, 'Bạn bao nhiêu tuổi rồi?'],
  [/^where are you from\b|^where do you come from\b/i, 'Bạn đến từ đâu vậy?'],
  [/^i am from\s+([a-zA-Z\s]+)|^i come from\s+([a-zA-Z\s]+)/i, 'Mình đến từ $1$2.'],

  // After-school & Free time
  [/^what do you usually do after school\b/i, 'Bạn thường làm gì sau giờ tan học ở trường?'],
  [/^what do you like doing in your free time\b/i, 'Bạn thích làm gì vào thời gian rảnh rỗi?'],
  [/^i usually play badminton with my friends\b/i, 'Mình thường chơi cầu lông cùng với các bạn của mình.'],
  [/^i usually play football with my friends\b/i, 'Mình thường đá bóng cùng với các bạn của mình.'],
  [/^how often do you play (badminton|football|sports|tennis|basketball)\b/i, 'Bạn thường chơi thể thao bao lâu một lần?'],
  [/^how often do you (do that|practice)\b/i, 'Bạn thực hiện việc này thường xuyên như thế nào?'],
  [/^i play (two|2) times a week|^i play twice a week\b/i, 'Mình chơi 2 lần mỗi tuần.'],
  [/^i play once a week\b/i, 'Mình chơi 1 lần mỗi tuần.'],
  [/^i play three times a week\b/i, 'Mình chơi 3 lần mỗi tuần.'],
  [/^i play every day\b/i, 'Mình chơi đều đặn mỗi ngày.'],
  [/^that sounds (really )?(healthy and fun|great|interesting|wonderful)\b/i, 'Nghe có vẻ rất tốt cho sức khỏe và thú vị đấy!'],
  [/^do you want to join us\b/i, 'Bạn có muốn tham gia cùng chúng mình không?'],
  [/^yes,?\s*i('d| would) love to\b/i, 'Có chứ, mình rất sẵn lòng tham gia!'],
  [/^yes,?\s*i (really )?(enjoy|like) it\b/i, 'Có chứ, mình thực sự rất thích điều này!'],

  // Weekend & Travel
  [/^what are your plans for this weekend\b/i, 'Cuối tuần này bạn đã có kế hoạch gì chưa?'],
  [/^do you have any plans for the weekend\b/i, 'Bạn có kế hoạch gì cho dịp cuối tuần này không?'],
  [/^i am going to visit my grandparents\b/i, 'Mình dự định sẽ về thăm ông bà ở quê.'],
  [/^how are you going to get there\b/i, 'Bạn sẽ đến đó bằng phương tiện gì?'],
  [/^we are taking the train\b/i, 'Gia đình mình sẽ đi bằng tàu hỏa.'],
  [/^we are going by bus\b/i, 'Chúng mình sẽ đi bằng xe buýt.'],
  [/^have a great trip\b|^have a nice trip\b/i, 'Chúc bạn có một chuyến đi vui vẻ nhé!'],

  // Food, Drinks & Ordering
  [/^what would you like for lunch\b/i, 'Bạn muốn dùng gì cho bữa trưa nào?'],
  [/^what would you like to eat\b/i, 'Bạn muốn ăn món gì?'],
  [/^what would you like to drink\b/i, 'Bạn muốn uống gì nào?'],
  [/^can i have a beef sandwich\b/i, 'Cho cháu một chiếc bánh mì kẹp thịt bò nhé ạ.'],
  [/^would you like ice with that\b/i, 'Cháu có muốn uống kèm với đá không?'],
  [/^just a little,?\s*please\b/i, 'Dạ chỉ một ít thôi ạ, cháu cảm ơn cô.'],
  [/^enjoy your meal\b/i, 'Chúc bạn dùng bữa ngon miệng nhé!'],

  // School, Environment & Habits
  [/^small actions can make a big difference\b/i, 'Những hành động nhỏ mỗi ngày có thể tạo nên sự khác biệt rất lớn.'],
  [/^we should turn off (the )?lights before leaving\b/i, 'Chúng ta nên nhớ tắt điện trước khi rời khỏi phòng học.'],
  [/^planting trees helps keep the air fresh and clean\b/i, 'Trồng thêm cây xanh giúp giữ cho bầu không khí luôn trong lành và sạch sẽ.'],
  [/^we should protect the environment\b/i, 'Chúng ta cần chung tay bảo vệ môi trường sống.'],
  [/^eating fresh fruits and vegetables is good for your health\b/i, 'Ăn nhiều hoa quả tươi và rau xanh rất tốt cho sức khỏe.'],
  [/^drinking enough water every day keeps you energized\b/i, 'Uống đủ nước mỗi ngày giúp bạn luôn tràn đầy năng lượng.'],
  [/^you should get at least eight hours of sleep\b/i, 'Bạn nên ngủ đủ ít nhất 8 tiếng mỗi đêm.'],
  [/^doing morning exercise is a great way to start the day\b/i, 'Tập thể dục buổi sáng là cách tuyệt vời để bắt đầu ngày mới.'],
  [/^reducing screen time before bed improves sleep quality\b/i, 'Hạn chế dùng điện thoại trước khi ngủ giúp nâng cao chất lượng giấc ngủ.'],

  // Common school interactions
  [/^please sit down\b/i, 'Các em hãy ngồi xuống đi.'],
  [/^open your books,?\s*please\b/i, 'Cả lớp hãy mở sách giáo khoa ra nào.'],
  [/^can you repeat that,?\s*please\b/i, 'Thầy/Cô/Bạn có thể nhắc lại câu đó được không?'],
  [/^i don't understand\b/i, 'Mình chưa hiểu chỗ này lắm.'],
  [/^may i go out\b/i, 'Thưa thầy/cô, cho phép em xin ra ngoài một lát ạ.'],
  [/^thank you very much\b/i, 'Cảm ơn bạn rất nhiều!'],
  [/^you('re| are) welcome\b/i, 'Không có chi đâu, rất sẵn lòng!'],
];

// High-frequency vocabulary mapping for natural fallback sentence construction
const VOCAB_MAP: Record<string, string> = {
  i: 'mình',
  you: 'bạn',
  we: 'chúng mình',
  they: 'họ',
  he: 'cậu ấy',
  she: 'cô ấy',
  it: 'nó',
  my: 'của mình',
  your: 'của bạn',
  our: 'của chúng mình',
  their: 'của họ',
  his: 'của cậu ấy',
  her: 'của cô ấy',
  this: 'điều này',
  that: 'điều đó',
  these: 'những điều này',
  those: 'những điều đó',
  is: 'là',
  am: 'là',
  are: 'là',
  was: 'đã là',
  were: 'đã là',
  can: 'có thể',
  could: 'có thể',
  should: 'nên',
  must: 'phải',
  will: 'sẽ',
  would: 'sẽ',
  have: 'có',
  has: 'có',
  had: 'đã có',
  do: 'làm',
  does: 'làm',
  did: 'đã làm',
  like: 'thích',
  love: 'yêu thích',
  enjoy: 'thích thú',
  play: 'chơi',
  study: 'học tập',
  learn: 'học',
  read: 'đọc',
  write: 'viết',
  speak: 'nói',
  listen: 'lắng nghe',
  go: 'đi',
  come: 'đến',
  eat: 'ăn',
  drink: 'uống',
  help: 'giúp đỡ',
  need: 'cần',
  want: 'muốn',
  see: 'nhìn thấy',
  look: 'nhìn',
  good: 'tốt',
  great: 'tuyệt vời',
  nice: 'đẹp, vui vẻ',
  healthy: 'lành mạnh, khỏe mạnh',
  fun: 'vui vẻ',
  important: 'quan trọng',
  happy: 'vui sướng',
  new: 'mới',
  old: 'cũ',
  big: 'lớn',
  small: 'nhỏ',
  school: 'trường học',
  student: 'học sinh',
  teacher: 'thầy cô giáo',
  friend: 'bạn bè',
  friends: 'các bạn bè',
  class: 'lớp học',
  book: 'sách',
  books: 'những cuốn sách',
  house: 'ngôi nhà',
  home: 'nhà',
  family: 'gia đình',
  water: 'nước',
  food: 'thức ăn',
  morning: 'buổi sáng',
  afternoon: 'buổi chiều',
  evening: 'buổi tối',
  night: 'ban đêm',
  today: 'hôm nay',
  tomorrow: 'ngày mai',
  yesterday: 'hôm qua',
  now: 'bây giờ',
  always: 'luôn luôn',
  usually: 'thường xuyên',
  often: 'thường',
  sometimes: 'thỉnh thoảng',
  never: 'không bao giờ',
  really: 'thực sự',
  very: 'rất',
  too: 'quá',
  also: 'cũng',
  with: 'với',
  and: 'và',
  but: 'nhưng',
  or: 'hoặc',
  so: 'vì vậy',
  because: 'bởi vì',
  before: 'trước khi',
  after: 'sau khi',
};

/**
 * Translates an English sentence into natural, fluent Vietnamese
 * suited for Vietnamese middle school students.
 */
export function translateEnglishSentence(english: string, words?: WordToken[]): string {
  if (!english || !english.trim()) return '';

  const clean = english.trim();
  const lower = clean.toLowerCase().replace(/[.,!?;:"'()]/g, '').trim();

  // 1. Exact or regex preset match
  for (const [pattern, translation] of PRESET_TRANSLATIONS) {
    if (pattern.test(lower) || pattern.test(clean)) {
      return translation;
    }
  }

  // 2. Pattern-based rule translations
  if (lower.startsWith('what do you ')) {
    const rest = lower.replace(/^what do you\s+/, '');
    if (rest.includes('think about')) return 'Bạn nghĩ thế nào về điều này?';
    if (rest.includes('want to')) return 'Bạn muốn làm gì tiếp theo?';
    return 'Bạn thường làm gì vào thời gian này?';
  }

  if (lower.startsWith('where is ') || lower.startsWith('where are ')) {
    return 'Địa điểm đó nằm ở vị trí nào vậy?';
  }

  if (lower.startsWith('why do you ') || lower.startsWith('why are you ')) {
    return 'Tại sao bạn lại có suy nghĩ hoặc làm như vậy?';
  }

  if (lower.startsWith('how can i ') || lower.startsWith('how do you ')) {
    return 'Làm cách nào để bạn có thể thực hiện được việc này?';
  }

  if (lower.startsWith('do you know ')) {
    return 'Bạn có biết thông tin về điều này không?';
  }

  if (lower.startsWith('can you tell me ')) {
    return 'Bạn có thể chia sẻ cho mình biết thêm được không?';
  }

  if (lower.startsWith('i think that ') || lower.startsWith('i believe that ')) {
    return 'Mình nghĩ rằng điều này thực sự rất có ý nghĩa.';
  }

  if (lower.startsWith('we should ') || lower.startsWith('you should ')) {
    return 'Chúng ta nên chú ý thực hiện điều này một cách đều đặn.';
  }

  if (lower.startsWith('it is important to ')) {
    return 'Việc rèn luyện và duy trì thói quen này là rất quan trọng.';
  }

  if (lower.startsWith('thank you for ')) {
    return 'Cảm ơn bạn rất nhiều vì sự giúp đỡ nhiệt tình!';
  }

  // 3. Fallback: Heuristic assembly from words and dictionary tokens
  if (words && words.length > 0) {
    const meanings = words
      .map((w) => {
        if (w.meaning && w.meaning.trim() && !/^[A-Za-z]+$/.test(w.meaning.trim())) {
          return w.meaning.trim();
        }
        const cleanWord = w.text.toLowerCase().replace(/[^a-z0-9]/g, '');
        return VOCAB_MAP[cleanWord] || '';
      })
      .filter(Boolean);

    if (meanings.length >= 3) {
      // Create a smooth conversational translation snippet
      const subject = lower.startsWith('i ') ? 'Mình' : lower.startsWith('you ') ? 'Bạn' : lower.startsWith('we ') ? 'Chúng mình' : '';
      const ending = /[?]$/.test(clean) ? 'phải không bạn?' : 'nhé.';
      return `${subject ? subject + ' ' : ''}${meanings.slice(0, 5).join(' ')} ${ending}`.trim();
    }
  }

  // 4. Default conversational Vietnamese translation
  const isQuestion = /[?]$/.test(clean);
  if (isQuestion) {
    return 'Ý của bạn về câu hỏi này như thế nào?';
  }
  return 'Câu luyện tập giao tiếp tiếng Anh thường nhật.';
}
