import http from 'http';
import { Socket } from 'net';

/**
 * In-Memory Request Dispatcher for Express
 * Bypasses network socket binding (100% sandboxed, zero EACCES errors on Windows)
 */
export function dispatchRequest(app, method, url, body = null) {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = url;

    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

    req.headers = {
      'host': 'localhost',
      'content-type': 'application/json'
    };

    if (payload !== null) {
      req.headers['content-length'] = Buffer.byteLength(payload);
    }

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    let responseData = '';
    const origWrite = res.write.bind(res);
    res.write = (chunk, encoding, callback) => {
      if (chunk) responseData += chunk;
      return true;
    };

    res.end = (chunk, encoding, callback) => {
      if (chunk) responseData += chunk;
      let parsed = responseData;
      try {
        parsed = JSON.parse(responseData);
      } catch {}

      resolve({
        status: res.statusCode,
        headers: res.getHeaders ? res.getHeaders() : {},
        body: parsed,
        text: responseData
      });
    };

    try {
      if (payload !== null) {
        req.push(payload);
      }
      req.push(null);

      app(req, res, (err) => {
        if (err) reject(err);
        else resolve({ status: 404, body: { error: 'Not Found' } });
      });
    } catch (e) {
      reject(e);
    }
  });
}
