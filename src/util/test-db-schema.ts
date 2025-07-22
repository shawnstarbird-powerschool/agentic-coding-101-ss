process.env.APP_TABLE_NAME = 'power-ftp-dev-gary';

// eslint-disable-next-line import/first
import { Tenant, User } from './db-schema';

(async () => {
  // await User.upsert({
  //   id: '01JR8V74MF64704N40ZT84600W',
  //   name: 'Gary Bisaga',
  //   email: 'gary.bisaga@powerschool.com'
  // });
  // const recs = await User.find({ gsipk: 'ALL_USERS' }, { index: 'GSI1' });
  // console.log('recs', recs);
  // const rec = await User.get({ id: '01JR8V74MF64704N40ZT84600W' });
  // console.log('rec', rec);
  await Tenant.upsert({
    id: '01JR900W20V2E7TXEXGWT9V2HC',
    name: 'Apple Grove',
    domain: 'applegrove.k12.va.us'
  });
  const recs = await Tenant.find({ gsipk: 'ALL_TENANTS' }, { index: 'GSI1' });
  console.log('tenants', recs);
  await User.upsert({
    id: '01JR90PAB2RM78DARSK4CA69YH',
    tenantId: '01JR900W20V2E7TXEXGWT9V2HC',
    name: 'Gary J Bisaga',
    email: 'gary.bisaga@powerschool.com',
    authenticationType: 'SSH key',
    folder: '/pm/qti',
    access: 'write',
    ipWhitelist: ['1.2.3.4/32', '2.3.4.0/24']
  });

  const users = await User.find({ tenantId: '01JR900W20V2E7TXEXGWT9V2HC' });
  console.log('users', users);
})();
