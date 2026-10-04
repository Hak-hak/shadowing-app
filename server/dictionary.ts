/**
 * Built-in educational English-Vietnamese dictionary & phonetics
 * for secondary school students (THCS lớp 6 - 9)
 */

interface WordData {
  ipa: string;
  meaning: string;
}

export const VOCAB_DICTIONARY: Record<string, WordData> = {
  // Pronouns & Basic words
  i: { ipa: "/aɪ/", meaning: "tôi, mình" },
  you: { ipa: "/juː/", meaning: "bạn, các bạn" },
  we: { ipa: "/wiː/", meaning: "chúng tôi, chúng ta" },
  they: { ipa: "/ðeɪ/", meaning: "họ, chúng nó" },
  he: { ipa: "/hiː/", meaning: "anh ấy, cậu ấy" },
  she: { ipa: "/ʃiː/", meaning: "cô ấy, bạn ấy" },
  it: { ipa: "/ɪt/", meaning: "nó, điều đó" },
  my: { ipa: "/maɪ/", meaning: "của tôi" },
  your: { ipa: "/jɔːr/", meaning: "của bạn" },
  our: { ipa: "/ˈaʊ.ər/", meaning: "của chúng tôi" },
  their: { ipa: "/ðeər/", meaning: "của họ" },
  his: { ipa: "/hɪz/", meaning: "của anh ấy" },
  her: { ipa: "/hɜːr/", meaning: "của cô ấy" },
  its: { ipa: "/ɪts/", meaning: "của nó" },
  me: { ipa: "/miː/", meaning: "tôi (tân ngữ)" },
  him: { ipa: "/hɪm/", meaning: "anh ấy (tân ngữ)" },
  them: { ipa: "/ðem/", meaning: "họ (tân ngữ)" },
  us: { ipa: "/ʌs/", meaning: "chúng tôi (tân ngữ)" },
  this: { ipa: "/ðɪs/", meaning: "cái này, điều này" },
  that: { ipa: "/ðæt/", meaning: "cái kia, điều đó" },
  these: { ipa: "/ðiːz/", meaning: "những cái này" },
  those: { ipa: "/ðoʊz/", meaning: "những cái kia" },

  // Auxiliary & Common Verbs
  am: { ipa: "/æm/", meaning: "là, ở, thì" },
  is: { ipa: "/ɪz/", meaning: "là, ở, thì" },
  are: { ipa: "/ɑːr/", meaning: "là, ở, thì" },
  was: { ipa: "/wɒz/", meaning: "đã là, đã ở" },
  were: { ipa: "/wɜːr/", meaning: "đã là, đã ở" },
  be: { ipa: "/biː/", meaning: "thì, là, ở" },
  been: { ipa: "/biːn/", meaning: "đã ở, từng là" },
  being: { ipa: "/ˈbiː.ɪŋ/", meaning: "đang là, hiện diện" },
  do: { ipa: "/duː/", meaning: "làm" },
  does: { ipa: "/dʌz/", meaning: "làm (ngôi 3 số ít)" },
  did: { ipa: "/dɪd/", meaning: "đã làm" },
  done: { ipa: "/dʌn/", meaning: "đã hoàn thành" },
  have: { ipa: "/hæv/", meaning: "có" },
  has: { ipa: "/hæz/", meaning: "có (ngôi 3 số ít)" },
  had: { ipa: "/hæd/", meaning: "đã có" },
  can: { ipa: "/kæn/", meaning: "có thể" },
  could: { ipa: "/kʊd/", meaning: "có thể (quá khứ)" },
  will: { ipa: "/wɪl/", meaning: "sẽ" },
  would: { ipa: "/wʊd/", meaning: "sẽ, muốn" },
  should: { ipa: "/ʃʊd/", meaning: "nên" },
  must: { ipa: "/mʌst/", meaning: "phải" },
  may: { ipa: "/meɪ/", meaning: "có lẽ, có thể" },
  might: { ipa: "/maɪt/", meaning: "có thể" },

  // Common verbs
  play: { ipa: "/pleɪ/", meaning: "chơi" },
  playing: { ipa: "/ˈpleɪ.ɪŋ/", meaning: "đang chơi" },
  played: { ipa: "/pleɪd/", meaning: "đã chơi" },
  plays: { ipa: "/pleɪz/", meaning: "chơi" },
  like: { ipa: "/laɪk/", meaning: "thích, giống như" },
  likes: { ipa: "/laɪks/", meaning: "thích" },
  liked: { ipa: "/laɪkt/", meaning: "đã thích" },
  love: { ipa: "/lʌv/", meaning: "yêu, rất thích" },
  enjoy: { ipa: "/ɪnˈdʒɔɪ/", meaning: "thích thú, tận hưởng" },
  go: { ipa: "/ɡoʊ/", meaning: "đi" },
  going: { ipa: "/ˈɡoʊ.ɪŋ/", meaning: "đang đi" },
  went: { ipa: "/went/", meaning: "đã đi" },
  gone: { ipa: "/ɡɒn/", meaning: "đã đi" },
  see: { ipa: "/siː/", meaning: "nhìn thấy, gặp" },
  saw: { ipa: "/sɔː/", meaning: "đã nhìn thấy" },
  seen: { ipa: "/siːn/", meaning: "thấy" },
  look: { ipa: "/lʊk/", meaning: "nhìn, trông có vẻ" },
  watch: { ipa: "/wɒtʃ/", meaning: "xem, theo dõi" },
  listen: { ipa: "/ˈlɪs.ən/", meaning: "lắng nghe" },
  speak: { ipa: "/spiːk/", meaning: "nói" },
  talk: { ipa: "/tɔːk/", meaning: "nói chuyện" },
  tell: { ipa: "/tel/", meaning: "kể, bảo" },
  say: { ipa: "/seɪ/", meaning: "nói" },
  said: { ipa: "/sed/", meaning: "đã nói" },
  hear: { ipa: "/hɪər/", meaning: "nghe thấy" },
  read: { ipa: "/riːd/", meaning: "đọc" },
  write: { ipa: "/raɪt/", meaning: "viết" },
  learn: { ipa: "/lɜːn/", meaning: "học" },
  study: { ipa: "/ˈstʌd.i/", meaning: "học tập, nghiên cứu" },
  practise: { ipa: "/ˈpræk.tɪs/", meaning: "luyện tập" },
  practice: { ipa: "/ˈpræk.tɪs/", meaning: "luyện tập" },
  help: { ipa: "/help/", meaning: "giúp đỡ" },
  make: { ipa: "/meɪk/", meaning: "làm, tạo ra" },
  take: { ipa: "/teɪk/", meaning: "cầm, lấy, đưa" },
  get: { ipa: "/ɡet/", meaning: "nhận, đạt được" },
  got: { ipa: "/ɡɒt/", meaning: "đã nhận được" },
  give: { ipa: "/ɡɪv/", meaning: "cho, tặng" },
  come: { ipa: "/kʌm/", meaning: "đến" },
  came: { ipa: "/keɪm/", meaning: "đã đến" },
  know: { ipa: "/noʊ/", meaning: "biết" },
  knew: { ipa: "/njuː/", meaning: "đã biết" },
  think: { ipa: "/θɪŋk/", meaning: "nghĩ" },
  feel: { ipa: "/fiːl/", meaning: "cảm thấy" },
  want: { ipa: "/wɒnt/", meaning: "muốn" },
  need: { ipa: "/niːd/", meaning: "cần" },
  try: { ipa: "/traɪ/", meaning: "thử, cố gắng" },
  work: { ipa: "/wɜːk/", meaning: "làm việc" },
  live: { ipa: "/lɪv/", meaning: "sống" },
  stay: { ipa: "/steɪ/", meaning: "ở lại" },
  eat: { ipa: "/iːt/", meaning: "ăn" },
  drink: { ipa: "/drɪŋk/", meaning: "uống" },
  sleep: { ipa: "/sliːp/", meaning: "ngủ" },
  walk: { ipa: "/wɔːk/", meaning: "đi bộ" },
  run: { ipa: "/rʌn/", meaning: "chạy" },
  swim: { ipa: "/swɪm/", meaning: "bơi" },
  join: { ipa: "/dʒɔɪn/", meaning: "tham gia cùng" },
  meet: { ipa: "/miːt/", meaning: "gặp gỡ" },
  start: { ipa: "/stɑːt/", meaning: "bắt đầu" },
  finish: { ipa: "/ˈfɪn.ɪʃ/", meaning: "kết thúc, xong" },
  sound: { ipa: "/saʊnd/", meaning: "nghe có vẻ" },
  sounds: { ipa: "/saʊndz/", meaning: "nghe có vẻ" },

  // Sports, Hobbies, Activities
  badminton: { ipa: "/ˈbæd.mɪn.tən/", meaning: "môn cầu lông" },
  football: { ipa: "/ˈfʊt.bɔːl/", meaning: "môn bóng đá" },
  soccer: { ipa: "/ˈsɒk.ər/", meaning: "môn bóng đá" },
  basketball: { ipa: "/ˈbɑː.skɪt.bɔːl/", meaning: "môn bóng rổ" },
  volleyball: { ipa: "/ˈvɒl.i.bɔːl/", meaning: "môn bóng chuyền" },
  tennis: { ipa: "/ˈten.ɪs/", meaning: "môn quần vợt" },
  chess: { ipa: "/tʃes/", meaning: "môn cờ vua" },
  music: { ipa: "/ˈmjuː.zɪk/", meaning: "âm nhạc" },
  guitar: { ipa: "/ɡɪˈtɑːr/", meaning: "đàn ghi-ta" },
  piano: { ipa: "/piˈæn.oʊ/", meaning: "đàn dương cầm" },
  sport: { ipa: "/spɔːt/", meaning: "thể thao" },
  sports: { ipa: "/spɔːts/", meaning: "các môn thể thao" },
  game: { ipa: "/ɡeɪm/", meaning: "trò chơi, trận đấu" },
  exercise: { ipa: "/ˈek.sə.saɪz/", meaning: "tập thể dục" },
  hobby: { ipa: "/ˈhɒb.i/", meaning: "sở thích" },

  // School, Time, Places
  school: { ipa: "/skuːl/", meaning: "trường học" },
  teacher: { ipa: "/ˈtiː.tʃər/", meaning: "thầy cô giáo" },
  student: { ipa: "/ˈstjuː.dənt/", meaning: "học sinh" },
  friend: { ipa: "/frend/", meaning: "người bạn" },
  friends: { ipa: "/frendz/", meaning: "những người bạn" },
  class: { ipa: "/klɑːs/", meaning: "lớp học" },
  classroom: { ipa: "/ˈklɑːs.ruːm/", meaning: "phòng học" },
  homework: { ipa: "/ˈhoʊm.wɜːk/", meaning: "bài tập về nhà" },
  lesson: { ipa: "/ˈles.ən/", meaning: "bài học" },
  book: { ipa: "/bʊk/", meaning: "cuốn sách" },
  library: { ipa: "/ˈlaɪ.brər.i/", meaning: "thư viện" },
  park: { ipa: "/pɑːk/", meaning: "công viên" },
  house: { ipa: "/haʊs/", meaning: "ngôi nhà" },
  home: { ipa: "/hoʊm/", meaning: "nhà, tổ ấm" },
  room: { ipa: "/ruːm/", meaning: "căn phòng" },
  club: { ipa: "/klʌb/", meaning: "câu lạc bộ" },
  court: { ipa: "/kɔːt/", meaning: "sân đấu (cầu lông, bóng rổ)" },
  yard: { ipa: "/jɑːd/", meaning: "sân trường, sân nhà" },

  // Time words
  time: { ipa: "/taɪm/", meaning: "thời gian, lúc" },
  day: { ipa: "/deɪ/", meaning: "ngày" },
  today: { ipa: "/təˈdeɪ/", meaning: "hôm nay" },
  tomorrow: { ipa: "/təˈmɒr.oʊ/", meaning: "ngày mai" },
  yesterday: { ipa: "/ˈjes.tə.deɪ/", meaning: "hôm qua" },
  morning: { ipa: "/ˈmɔː.nɪŋ/", meaning: "buổi sáng" },
  afternoon: { ipa: "/ˌɑːf.təˈnuːn/", meaning: "buổi chiều" },
  evening: { ipa: "/ˈiːv.nɪŋ/", meaning: "buổi tối" },
  night: { ipa: "/naɪt/", meaning: "ban đêm" },
  weekend: { ipa: "/ˌwiːkˈend/", meaning: "cuối tuần" },
  week: { ipa: "/wiːk/", meaning: "tuần lễ" },
  now: { ipa: "/naʊ/", meaning: "bây giờ" },
  then: { ipa: "/ðen/", meaning: "sau đó, khi ấy" },
  always: { ipa: "/ˈɔːl.weɪz/", meaning: "luôn luôn" },
  usually: { ipa: "/ˈjuː.ʒu.ə.li/", meaning: "thường thường" },
  often: { ipa: "/ˈɒf.ən/", meaning: "thường xuyên" },
  sometimes: { ipa: "/ˈsʌm.taɪmz/", meaning: "thỉnh thoảng" },
  never: { ipa: "/ˈnev.ər/", meaning: "không bao giờ" },
  early: { ipa: "/ˈɜː.li/", meaning: "sớm" },
  late: { ipa: "/leɪt/", meaning: "muộn, trễ" },

  // Question words & Conjunctions
  what: { ipa: "/wɒt/", meaning: "cái gì, gì" },
  where: { ipa: "/weər/", meaning: "ở đâu" },
  when: { ipa: "/wen/", meaning: "khi nào" },
  why: { ipa: "/waɪ/", meaning: "tại sao" },
  who: { ipa: "/huː/", meaning: "ai" },
  which: { ipa: "/wɪtʃ/", meaning: "cái nào" },
  how: { ipa: "/haʊ/", meaning: "như thế nào, bằng cách nào" },
  and: { ipa: "/ænd/", meaning: "và" },
  or: { ipa: "/ɔːr/", meaning: "hoặc, hay là" },
  but: { ipa: "/bʌt/", meaning: "nhưng" },
  because: { ipa: "/bɪˈkɒz/", meaning: "bởi vì" },
  so: { ipa: "/soʊ/", meaning: "vì vậy, nên" },
  if: { ipa: "/ɪf/", meaning: "nếu" },
  with: { ipa: "/wɪð/", meaning: "cùng với" },
  for: { ipa: "/fɔːr/", meaning: "cho, dành cho" },
  to: { ipa: "/tuː/", meaning: "đến, để" },
  in: { ipa: "/ɪn/", meaning: "ở trong" },
  at: { ipa: "/æt/", meaning: "ở tại, vào lúc" },
  on: { ipa: "/ɒn/", meaning: "trên, vào ngày" },
  about: { ipa: "/əˈbaʊt/", meaning: "về, khoảng" },
  after: { ipa: "/ˈɑːf.tər/", meaning: "sau khi" },
  before: { ipa: "/bɪˈfɔːr/", meaning: "trước khi" },

  // Adjectives & Adverbs
  good: { ipa: "/ɡʊd/", meaning: "tốt, hay" },
  great: { ipa: "/ɡreɪt/", meaning: "tuyệt vời" },
  nice: { ipa: "/naɪs/", meaning: "đẹp, dễ thương" },
  happy: { ipa: "/ˈhæp.i/", meaning: "vui vẻ, hạnh phúc" },
  ready: { ipa: "/ˈred.i/", meaning: "sẵn sàng" },
  fun: { ipa: "/fʌn/", meaning: "vui vẻ, thú vị" },
  interesting: { ipa: "/ˈɪn.trəs.tɪŋ/", meaning: "thú vị" },
  easy: { ipa: "/ˈiː.zi/", meaning: "dễ dàng" },
  difficult: { ipa: "/ˈdɪf.ɪ.kəlt/", meaning: "khó khăn" },
  healthy: { ipa: "/ˈhel.θi/", meaning: "khỏe mạnh, lành mạnh" },
  strong: { ipa: "/strɒŋ/", meaning: "mạnh mẽ" },
  active: { ipa: "/ˈæk.tɪv/", meaning: "năng động" },
  tired: { ipa: "/ˈtaɪəd/", meaning: "mệt mỏi" },
  excited: { ipa: "/ɪkˈsaɪ.tɪd/", meaning: "hào hứng" },
  favorite: { ipa: "/ˈfeɪ.vər.ɪt/", meaning: "yêu thích" },
  new: { ipa: "/njuː/", meaning: "mới" },
  old: { ipa: "/oʊld/", meaning: "cũ, già" },
  big: { ipa: "/bɪɡ/", meaning: "to, lớn" },
  small: { ipa: "/smɔːl/", meaning: "nhỏ bé" },
  many: { ipa: "/ˈmen.i/", meaning: "nhiều" },
  much: { ipa: "/mʌtʃ/", meaning: "nhiều" },
  some: { ipa: "/sʌm/", meaning: "một vài" },
  every: { ipa: "/ˈev.ri/", meaning: "mỗi, mọi" },
  all: { ipa: "/ɔːl/", meaning: "tất cả" },
  very: { ipa: "/ˈver.i/", meaning: "rất" },
  really: { ipa: "/ˈrɪə.li/", meaning: "thực sự" },
  too: { ipa: "/tuː/", meaning: "quá, cũng" },
  also: { ipa: "/ˈɔːl.soʊ/", meaning: "cũng" },
  together: { ipa: "/təˈɡeð.ər/", meaning: "cùng nhau" },
  well: { ipa: "/wel/", meaning: "tốt, giỏi" },

  // Conversational terms
  hello: { ipa: "/heˈloʊ/", meaning: "xin chào" },
  hi: { ipa: "/haɪ/", meaning: "chào bạn" },
  hey: { ipa: "/heɪ/", meaning: "này, chào" },
  yes: { ipa: "/jes/", meaning: "vâng, đúng vậy" },
  no: { ipa: "/noʊ/", meaning: "không" },
  yeah: { ipa: "/jeə/", meaning: "ừ, đúng rồi" },
  sure: { ipa: "/ʃɔːr/", meaning: "chắc chắn rồi" },
  ok: { ipa: "/ˌoʊˈkeɪ/", meaning: "được rồi, đồng ý" },
  okay: { ipa: "/ˌoʊˈkeɪ/", meaning: "được rồi" },
  please: { ipa: "/pliːz/", meaning: "làm ơn, xin vui lòng" },
  thank: { ipa: "/θæŋk/", meaning: "cảm ơn" },
  thanks: { ipa: "/θæŋks/", meaning: "cảm ơn bạn" },
  welcome: { ipa: "/ˈwel.kəm/", meaning: "hoan nghênh, không có chi" },
  sorry: { ipa: "/ˈsɒr.i/", meaning: "xin lỗi" },
  bye: { ipa: "/baɪ/", meaning: "tạm biệt" },
  goodbye: { ipa: "/ˌɡʊdˈbaɪ/", meaning: "tạm biệt" },
  let: { ipa: "/let/", meaning: "để, cho phép" },
  lets: { ipa: "/lets/", meaning: "hãy cùng (chúng ta)" },
  "let's": { ipa: "/lets/", meaning: "chúng mình cùng nhau" },

  // Contractions
  "i'm": { ipa: "/aɪm/", meaning: "tôi là, mình đang" },
  "you're": { ipa: "/jɔːr/", meaning: "bạn là, bạn đang" },
  "we're": { ipa: "/wɪər/", meaning: "chúng tôi là" },
  "they're": { ipa: "/ðeər/", meaning: "họ là" },
  "it's": { ipa: "/ɪts/", meaning: "nó là, đó là" },
  "he's": { ipa: "/hiːz/", meaning: "anh ấy là" },
  "she's": { ipa: "/ʃiːz/", meaning: "cô ấy là" },
  "that's": { ipa: "/ðæts/", meaning: "điều đó là, đó là" },
  "what's": { ipa: "/wɒts/", meaning: "cái gì là" },
  "don't": { ipa: "/doʊnt/", meaning: "không (làm)" },
  "doesn't": { ipa: "/ˈdʌz.ənt/", meaning: "không (làm)" },
  "didn't": { ipa: "/ˈdɪd.ənt/", meaning: "đã không" },
  "can't": { ipa: "/kɑːnt/", meaning: "không thể" },
  "won't": { ipa: "/woʊnt/", meaning: "sẽ không" },
  "i'll": { ipa: "/aɪl/", meaning: "tôi sẽ" },
  "you'll": { ipa: "/juːl/", meaning: "bạn sẽ" },
  "we'll": { ipa: "/wiːl/", meaning: "chúng ta sẽ" },
  "i've": { ipa: "/aɪv/", meaning: "tôi đã có/từng" },
  "you've": { ipa: "/juːv/", meaning: "bạn đã có/từng" },
};

/**
 * Clean a word token and look up pronunciation & Vietnamese definition
 */
export function lookupWord(rawWord: string): WordData {
  const cleaned = rawWord
    .toLowerCase()
    .replace(/^[.,/#!$%^&*;:{}=\-_`~()?"']+|[.,/#!$%^&*;:{}=\-_`~()?"']+$/g, "");

  if (VOCAB_DICTIONARY[cleaned]) {
    return VOCAB_DICTIONARY[cleaned];
  }

  // Handle plural nouns ending in 's' or 'es'
  if (cleaned.endsWith("s") && cleaned.length > 2) {
    const singular = cleaned.slice(0, -1);
    if (VOCAB_DICTIONARY[singular]) {
      return {
        ipa: `${VOCAB_DICTIONARY[singular].ipa.slice(0, -1)}s/`,
        meaning: `${VOCAB_DICTIONARY[singular].meaning} (số nhiều)`,
      };
    }
  }

  // Handle verbs ending in 'ing'
  if (cleaned.endsWith("ing") && cleaned.length > 4) {
    const base = cleaned.slice(0, -3);
    if (VOCAB_DICTIONARY[base]) {
      return {
        ipa: `${VOCAB_DICTIONARY[base].ipa.slice(0, -1)}ɪŋ/`,
        meaning: `đang ${VOCAB_DICTIONARY[base].meaning}`,
      };
    }
  }

  // Handle past tense 'ed'
  if (cleaned.endsWith("ed") && cleaned.length > 3) {
    const base = cleaned.slice(0, -2);
    if (VOCAB_DICTIONARY[base]) {
      return {
        ipa: `${VOCAB_DICTIONARY[base].ipa.slice(0, -1)}d/`,
        meaning: `đã ${VOCAB_DICTIONARY[base].meaning}`,
      };
    }
  }

  // Fallback: Generate reasonable IPA phonetic marker and placeholder meaning
  return {
    ipa: `/${cleaned}/`,
    meaning: "từ vựng trong câu",
  };
}

/**
 * Common phrase translation heuristics for natural sentence meanings
 */
export function translateSentenceHeuristic(sentence: string): string {
  const s = sentence.trim();
  const lower = s.toLowerCase().replace(/[.?!,]+$/, "");

  // Common THCS textbook patterns
  if (/^what do you usually do (after school|in your free time)\b/i.test(lower)) {
    return lower.includes("after school")
      ? "Bạn thường làm gì sau giờ học ở trường?"
      : "Bạn thường làm gì vào thời gian rảnh rỗi?";
  }

  if (/^how often do you play (badminton|football|soccer|tennis|basketball|sports)\b/i.test(lower)) {
    const sportName: Record<string, string> = {
      badminton: "cầu lông",
      football: "bóng đá",
      soccer: "bóng đá",
      tennis: "quần vợt",
      basketball: "bóng rổ",
      sports: "thể thao",
    };
    const sport = lower.match(/(badminton|football|soccer|tennis|basketball|sports)/i)?.[1] || "thể thao";
    return `Bạn có thường xuyên chơi ${sportName[sport.toLowerCase()] || sport} không?`;
  }

  if (/^i play (it|them)?\s*(once|twice|three times)\s*a\s*week\b/i.test(lower)) {
    if (lower.includes("once")) return "Mình chơi môn này một lần mỗi tuần.";
    if (lower.includes("twice")) return "Mình chơi hai lần mỗi tuần.";
    return "Mình chơi ba lần một tuần.";
  }

  if (/eating healthy food is very important\b/i.test(lower)) {
    return "Ăn uống thực phẩm lành mạnh là điều vô cùng quan trọng đối với học sinh.";
  }

  if (/drink plenty of water and eat fresh fruits\b/i.test(lower)) {
    return "Bạn nên uống thật nhiều nước và ăn trái cây tươi mỗi ngày.";
  }

  if (/exercising regularly also helps you stay active and happy\b/i.test(lower)) {
    return "Tập thể dục đều đặn cũng giúp bạn luôn năng động, khỏe khoắn và vui vẻ.";
  }

  if (/^do you (like|enjoy) to play (badminton|football|soccer|tennis|basketball)\b/i.test(lower)) {
    const sport = lower.match(/(badminton|football|soccer|tennis|basketball)/i)?.[1] || "thể thao";
    const sportName: Record<string, string> = {
      badminton: "cầu lông",
      football: "bóng đá",
      soccer: "bóng đá",
      tennis: "quần vợt",
      basketball: "bóng rổ",
    };
    return `Bạn có thích chơi ${sportName[sport.toLowerCase()] || sport} không?`;
  }

  if (/^yes,?\s+i\s+(really\s+)?(enjoy|like|love)\s+it\b/i.test(lower)) {
    return "Có chứ, mình rất thích chơi môn này.";
  }

  if (/what time do you usually play\b/i.test(lower)) {
    return "Bạn thường chơi vào lúc mấy giờ?";
  }

  if (/i usually play in the afternoon\b/i.test(lower)) {
    return "Mình thường chơi vào buổi chiều sau giờ tan học.";
  }

  if (/how about tomorrow morning\b/i.test(lower)) {
    return "Sáng mai thì thế nào, bạn có rảnh không?";
  }

  if (/that sounds great\b/i.test(lower)) {
    return "Nghe tuyệt quá! Hẹn gặp bạn lúc đó nhé.";
  }

  if (/see you (then|tomorrow|later)\b/i.test(lower)) {
    return "Hẹn sớm gặp lại bạn nhé!";
  }

  if (/^what is your favorite\b/i.test(lower)) {
    return "Sở thích yêu thích nhất của bạn là gì?";
  }

  if (/^how are you\b/i.test(lower)) {
    return "Hôm nay bạn thế nào?";
  }

  if (/^i('m| am) fine,?\s*thank(s| you)?\b/i.test(lower)) {
    return "Mình khỏe, cảm ơn bạn nhiều nhé!";
  }

  if (/^nice to meet you\b/i.test(lower)) {
    return "Rất vui khi được làm quen với bạn!";
  }

  if (/^let('s|s) play\b/i.test(lower)) {
    return "Chúng mình cùng tham gia chơi nhé!";
  }

  if (/^where do you live\b/i.test(lower)) {
    return "Bạn đang sống ở đâu?";
  }

  if (/^what's your name|^what is your name\b/i.test(lower)) {
    return "Tên của bạn là gì?";
  }

  // Common sentence structure heuristics
  if (lower.startsWith("i usually ") || lower.startsWith("i often ")) {
    return "Mình thường xuyên rèn luyện và thực hiện hoạt động này.";
  }

  if (lower.startsWith("you should ")) {
    return "Bạn nên chú ý thực hiện điều này đều đặn.";
  }

  if (lower.startsWith("do you ")) {
    return "Bạn có thường xuyên tham gia hoạt động này không?";
  }

  if (lower.startsWith("why do you ")) {
    return "Tại sao bạn lại yêu thích điều này?";
  }

  return "Câu luyện nói giao tiếp tiếng Anh thường nhật.";
}
