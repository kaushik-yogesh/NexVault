import mongoose from 'mongoose';

mongoose.connect('mongodb://127.0.0.1:27017/nexvault_db')
  .then(async () => {
    const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));
    const res = await Transaction.updateMany({ status: 'PENDING' }, { $set: { status: 'FAILED' } });
    console.log(`Updated ${res.modifiedCount} pending transactions to FAILED`);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
