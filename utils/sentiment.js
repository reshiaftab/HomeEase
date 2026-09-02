// utils/sentiment.js
// Lightweight lexicon-based sentiment analysis used to rank service providers.
// It scores each review's free-text comment (positive/negative/neutral) and
// combines that with the numeric rating to produce a 0..5 sentiment score.

const POSITIVE_WORDS = [
  "good", "great", "excellent", "amazing", "awesome", "fantastic", "wonderful",
  "perfect", "best", "love", "loved", "happy", "satisfied", "professional",
  "recommend", "recommended", "reliable", "punctual", "friendly", "polite",
  "honest", "clean", "fast", "quick", "efficient", "helpful", "skilled",
  "affordable", "fair", "nice", "outstanding", "superb", "brilliant",
  "thank", "thanks", "impressive", "quality", "neat", "on time", "trustworthy"
];

const NEGATIVE_WORDS = [
  "bad", "terrible", "awful", "horrible", "worst", "poor", "slow", "late",
  "rude", "unprofessional", "disappointed", "disappointing", "waste",
  "scam", "fraud", "broken", "damage", "damaged", "dirty", "overpriced",
  "expensive", "unreliable", "never", "avoid", "angry", "frustrated",
  "useless", "worse", "complain", "complaint", "refund", "cheat", "cheated",
  "arrogant", "careless", "incomplete", "regret"
];

// Words that flip the polarity of the following word ("not good", "no problem").
const NEGATIONS = ["not", "no", "never", "don't", "dont", "didn't", "didnt",
  "wasn't", "wasnt", "isn't", "isnt", "aren't", "arent", "without"];

/**
 * Analyse a single comment.
 * @returns {{score:number, positive:number, negative:number, label:string}}
 *   score in [-1, 1]
 */
export function analyzeSentiment(text = "") {
  const comment = String(text).toLowerCase();
  if (!comment.trim()) {
    return { score: 0, positive: 0, negative: 0, label: "neutral" };
  }

  const tokens = comment
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let positive = 0;
  let negative = 0;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    const prev = tokens[i - 1] || "";
    const negated = NEGATIONS.includes(prev);

    const isPos = POSITIVE_WORDS.some((w) => word === w || word.startsWith(w));
    const isNeg = NEGATIVE_WORDS.some((w) => word === w || word.startsWith(w));

    if (isPos) {
      negated ? negative++ : positive++;
    } else if (isNeg) {
      negated ? positive++ : negative++;
    }
  }

  const total = positive + negative;
  const score = total === 0 ? 0 : (positive - negative) / total;

  let label = "neutral";
  if (score > 0.2) label = "positive";
  else if (score < -0.2) label = "negative";

  return { score, positive, negative, label };
}

/**
 * Build a 0..5 reputation score for a provider from their reviews.
 * Blends the numeric rating (70%) with comment sentiment (30%). A provider
 * with no reviews gets a neutral baseline (0) so rated providers rank first.
 *
 * @param {Array<{rating:number, comment:string}>} reviews
 * @returns {{score:number, avgRating:number, reviewCount:number, positivePct:number}}
 */
export function providerSentimentScore(reviews = []) {
  if (!reviews || reviews.length === 0) {
    return { score: 0, avgRating: 0, reviewCount: 0, positivePct: 0 };
  }

  let ratingSum = 0;
  let sentimentSum = 0;
  let positiveComments = 0;

  for (const r of reviews) {
    const rating = Number(r.rating) || 0;
    ratingSum += rating;

    const { score, label } = analyzeSentiment(r.comment);
    // Map sentiment [-1,1] -> [0,5] scale.
    sentimentSum += (score + 1) * 2.5;
    if (label === "positive") positiveComments++;
  }

  const avgRating = ratingSum / reviews.length;
  const avgSentiment5 = sentimentSum / reviews.length;

  // Weighted blend, normalised to 0..5.
  const score = Math.min(5, Math.max(0, avgRating * 0.7 + avgSentiment5 * 0.3));

  return {
    score: Math.round(score * 100) / 100,
    avgRating: Math.round(avgRating * 100) / 100,
    reviewCount: reviews.length,
    positivePct: Math.round((positiveComments / reviews.length) * 100),
  };
}
