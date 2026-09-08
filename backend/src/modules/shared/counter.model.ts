import { Schema, model, type Model } from 'mongoose';

/**
 * Atomic named sequence generator — used for human-friendly business ids such as
 * `JC-1025`. `findOneAndUpdate` + `$inc` + `upsert` is atomic at the document
 * level, so concurrent job-card creation cannot produce a duplicate number.
 */
interface ICounter {
  _id: string;
  seq: number;
}
type CounterModel = Model<ICounter>;

const counterSchema = new Schema<ICounter, CounterModel>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { collection: 'counters', versionKey: false },
);

export const Counter = model<ICounter, CounterModel>('Counter', counterSchema);

export async function nextSequence(name: string, start = 1): Promise<number> {
  // Seed the counter at (start - 1) on first use so the first bump lands on `start`.
  await Counter.updateOne(
    { _id: name },
    { $setOnInsert: { seq: start - 1 } },
    { upsert: true },
  );
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true },
  ).lean();
  return doc?.seq ?? start;
}
