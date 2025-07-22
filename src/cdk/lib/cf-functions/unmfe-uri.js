/**
 * Transform MFE BFF URIs, chopping out the front part. So:
 *   /api/proxy/mfe/foobar/do_something => /do_something
 * Note: The assumption is, if this is called, it's for the right MFE's BFF.
 * @param {*} event
 * @returns
 */
function handler(event) {
  var request = event.request;

  console.log('before URI=[' + request.uri + ']');
  var matches = /^\/api\/proxy\/[Mm][Ff][Ee]\/[^/]*(\/.*)$/.exec(request.uri);
  if (matches) {
    request.uri = matches[1];
  }
  console.log('after URI=[' + request.uri + ']');
  return request;
}
