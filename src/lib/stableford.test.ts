import {
  emptyRound,
  scoreRound,
  stablefordPoints,
  strokesReceived,
} from "./stableford";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(strokesReceived(18, 1) === 1, "18 hcp gets 1 on every hole");
assert(strokesReceived(18, 18) === 1, "18 hcp gets 1 on SI 18");
assert(strokesReceived(10, 10) === 1, "10 hcp gets stroke on SI 10");
assert(strokesReceived(10, 11) === 0, "10 hcp no stroke on SI 11");
assert(strokesReceived(19, 1) === 2, "19 hcp gets 2 on SI 1");
assert(strokesReceived(19, 2) === 1, "19 hcp gets 1 on SI 2");
assert(strokesReceived(-2, 18) === -1, "plus 2 gives back on SI 18");
assert(strokesReceived(-2, 17) === -1, "plus 2 gives back on SI 17");
assert(strokesReceived(-2, 16) === 0, "plus 2 no give-back on SI 16");

assert(stablefordPoints(4, 4, 0) === 2, "gross par = 2 pts");
assert(stablefordPoints(4, 5, 1) === 2, "net par = 2 pts");
assert(stablefordPoints(4, 3, 0) === 3, "birdie = 3 pts");
assert(stablefordPoints(4, 6, 0) === 0, "double bogey = 0 pts");
assert(stablefordPoints(4, 7, 1) === 0, "net double+ = 0 pts");

const holes = emptyRound(18).map((h, i) => ({
  ...h,
  par: 4,
  strokeIndex: i + 1,
  gross: 5,
}));
const summary = scoreRound(holes, 18);
assert(summary.totalPoints === 36, `18 bogeys with 18 hcp should be 36, got ${summary.totalPoints}`);

console.log("stableford.test.ts: all passed");
