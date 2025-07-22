// Definition: This file contains the schema for the PushNotifications table.
/* eslint-disable no-template-curly-in-string */
export const PushNotificationsSchema = {
  format: 'onetable:1.1.0',
  version: '0.0.1',
  indexes: {
    primary: { hash: 'pk', sort: 'sk' },
    gsi1: { hash: 'gsi1pk', sort: 'gsi1sk' },
    upid: { hash: 'upidpk', sort: 'upidsk' },
    dcid: { hash: 'dcidpk', sort: 'dcidsk' }
  },
  models: {
    DeviceToken: {
      pk: { type: String, value: '${districtId}#record#${id}', hidden: false },
      sk: { type: String, value: 'token#${appName}#${token}', hidden: false },
      gsi1pk: { type: String, value: 'deviceToken#${token}', hidden: false },
      gsi1sk: { type: String, value: '#', hidden: false },
      upidpk: { type: String, value: '${districtId}#upid#${unifiedPersonId}' },
      upidsk: { type: String, value: 'token#${appName}#${token}' },
      dcidpk: { type: String, value: '${districtId}#dcid#${persona}#${dcid}' },
      dcidsk: { type: String, value: 'token#${appName}#${token}' },
      districtId: { type: String, required: true, encode: ['pk', '#', 0] },
      id: { type: String, required: true, encode: ['pk', '#', 2] },
      unifiedPersonId: { type: String, encode: ['upidpk', '#', 2] },
      dcid: { type: String, encode: ['dcidpk', '#', 4] },
      persona: { type: String, encode: ['dcidpk', '#', 3] },
      token: { type: String, required: true },
      appName: { type: String, required: true },
      deviceType: { type: String, enum: ['ios', 'android'], required: true }
    },
    Preference: {
      pk: { type: String, value: '${districtId}#record#${id}', hidden: false },
      sk: { type: String, value: 'preference#${name}', hidden: false },
      upidpk: { type: String, value: '${districtId}#upid#${unifiedPersonId}' },
      upidsk: { type: String, value: '#preference#${name}' },
      dcidpk: { type: String, value: '${districtId}#dcid#${persona}#${dcid}' },
      dcidsk: { type: String, value: '#preference#${name}' },
      districtId: { type: String, required: true, encode: ['pk', '#', 0] },
      id: { type: String, required: true, encode: ['pk', '#', 2] },
      unifiedPersonId: { type: String, encode: ['upidpk', '#', 2] },
      dcid: { type: String, encode: ['dcidpk', '#', 4] },
      persona: { type: String, encode: ['dcidpk', '#', 3] },
      name: { type: String, required: true },
      value: { type: String, required: true }
    }
  } as const,
  params: {
    isoDates: true,
    nulls: false
  }
};
