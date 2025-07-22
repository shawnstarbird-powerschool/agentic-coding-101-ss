import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Handler for the GET /session endpoint
 * Takes a query string parameter 'id' and sets it as a cookie called 'sessiontoken'
 * Then redirects to the same hostname without the 'api' prefix
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Session handler called with event:', JSON.stringify(event));

  // Get the 'id' query parameter
  const id = event.queryStringParameters?.id;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required query parameter: id' }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  // Extract the hostname from the Host header
  const host = event.headers.Host || event.headers.host;

  if (!host) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Unable to determine host' }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  // Create the redirect URL by removing 'api.' from the hostname
  const redirectHost = host.replace(/^api\./, '');
  const protocol = event.headers['X-Forwarded-Proto'] || 'https';
  const redirectUrl = `${protocol}://${redirectHost}`;

  console.log(`Redirecting to: ${redirectUrl}`);

  // Set the cookie and redirect
  return {
    statusCode: 302,
    headers: {
      Location: redirectUrl,
      'Set-Cookie': `adminsessiontoken=${id}; Domain=fileshare.powerschoolcorp.com; Path=/; Secure; HttpOnly; SameSite=Lax`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    },
    body: ''
  };
};
