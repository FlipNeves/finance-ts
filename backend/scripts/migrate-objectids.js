/*
 * One-off migration: normalize owner/reference ids stored as strings into
 * ObjectIds. Before the schema fix, these paths were Mixed, so each write
 * path stored whatever type it received — splitting the data into two
 * populations that queries could never see at the same time.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const HEX24 = /^[0-9a-fA-F]{24}$/;

async function fixField(db, coll, field) {
  const filter = { [field]: { $type: 'string', $regex: HEX24 } };
  const before = await db.collection(coll).countDocuments(filter);
  if (before === 0) return { coll, field, converted: 0 };
  const res = await db.collection(coll).updateMany(filter, [
    { $set: { [field]: { $toObjectId: `$${field}` } } },
  ]);
  return { coll, field, converted: res.modifiedCount };
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const targets = [
    ['transactions', 'userId'],
    ['transactions', 'familyId'],
    ['budgets', 'userId'],
    ['budgets', 'familyId'],
    ['goals', 'userId'],
    ['goals', 'familyId'],
    ['goalcontributions', 'userId'],
    ['goalcontributions', 'familyId'],
    ['goalcontributions', 'goalId'],
    ['goalcontributions', 'transactionId'],
    ['users', 'familyId'],
    ['families', 'owner'],
    ['telegramlinks', 'userId'],
  ];

  for (const [coll, field] of targets) {
    const r = await fixField(db, coll, field);
    if (r.converted > 0) console.log(`${coll}.${field}: ${r.converted} converted`);
  }

  // pendingMembers is an array of ids.
  const fam = await db.collection('families').updateMany(
    { pendingMembers: { $elemMatch: { $type: 'string' } } },
    [{
      $set: {
        pendingMembers: {
          $map: {
            input: '$pendingMembers',
            in: {
              $cond: [
                { $eq: [{ $type: '$$this' }, 'string'] },
                { $toObjectId: '$$this' },
                '$$this',
              ],
            },
          },
        },
      },
    }],
  );
  if (fam.modifiedCount > 0) console.log(`families.pendingMembers: ${fam.modifiedCount} docs converted`);

  // Sanity: nothing string-typed left on the main collection.
  const leftover = await db.collection('transactions').countDocuments({
    $or: [{ userId: { $type: 'string' } }, { familyId: { $type: 'string' } }],
  });
  console.log('Leftover string ids in transactions:', leftover);

  await mongoose.disconnect();
  console.log('Migration done.');
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
