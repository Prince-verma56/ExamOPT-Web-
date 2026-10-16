export interface IntegrationRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
  timeoutMs?: number;
  retries?: number;
}

export interface IntegrationResponse {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  headers: Record<string, string>;
}

export interface IntegrationProvider {
  request(req: IntegrationRequest): Promise<IntegrationResponse>;
}

export class RealHttpIntegrationProvider implements IntegrationProvider {
  async request(req: IntegrationRequest): Promise<IntegrationResponse> {
    const { url, method, headers, body, timeoutMs = 10000, retries = 1 } = req;
    
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        const respHeaders: Record<string, string> = {};
        response.headers.forEach((v, k) => { respHeaders[k] = v; });

        return {
          status: response.status,
          data,
          headers: respHeaders,
        };
      } catch (error) {
        attempt++;
        if (attempt > retries) {
          throw new Error(`Integration request failed after ${retries} retries: ${(error as Error).message}`);
        }
        // basic backoff
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    throw new Error('Unreachable');
  }
}

export class MockIntegrationProvider implements IntegrationProvider {
  async request(req: IntegrationRequest): Promise<IntegrationResponse> {
    console.log(`[MockIntegration] ${req.method} ${req.url}`);
    return {
      status: 200,
      data: { mock: true, receivedBody: req.body },
      headers: {},
    };
  }
}

export const integrationProvider = new RealHttpIntegrationProvider();
