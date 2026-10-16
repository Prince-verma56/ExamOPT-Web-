# Hackathon Mobile API Client Guide (Flutter / Swift / React Native)

This document explains how to build a mobile client that connects to the Fullstack Hackathon Template backend.

The backend is built with Next.js App Router API routes, but **it is strictly client-agnostic**. It uses standard HTTP and JSON contracts, making it natively compatible with Flutter, React Native, iOS, and Android.

## Base URL

Your mobile app should point to the Next.js origin.

- **Local:** `http://10.0.2.2:3000/api/v1` (Android emulator) or `http://localhost:3000/api/v1` (iOS simulator)
- **Production:** `https://your-app.com/api/v1`

## Authentication (Bearer Tokens)

The backend uses **Clerk** for authentication.

Mobile clients MUST send a valid Clerk JWT in the `Authorization` header. Do NOT rely on cookies for mobile requests.

```http
GET /api/v1/protected-route
Authorization: Bearer eyJhbGciOiJSUzI1...
```

If the token is missing or invalid, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

## Standard API Response Contract

All `/api/v1` endpoints enforce a strict wrapper. You will never receive raw text or HTML unless you request a non-API route.

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "uuid-v4",
    "timestamp": "2026-10-06T12:00:00.000Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": { ... }
  }
}
```

## Headers

Ensure your mobile client always sends:

```http
Content-Type: application/json
Accept: application/json
```

## Multipart Form Data (File Uploads)

When uploading files (e.g., to `/api/v1/files`), omit the `Content-Type` header (let your HTTP client generate the boundary) or explicitly use `multipart/form-data`.

## Realtime & Notifications

The backend uses Server-Sent Events (SSE) for realtime updates.

Endpoint: `GET /api/v1/realtime`

In Flutter, you can use packages like `sse_client` or `fetch_client` to listen to this stream.

Push notifications rely on Firebase Cloud Messaging (FCM). Your mobile app must register its device token with the backend (via a device registration endpoint) so the backend can target it.

## Idempotency

For sensitive mutations (e.g., payments, critical state changes), the API supports idempotency keys. 

If the backend specifies an endpoint requires idempotency, you can safely retry network timeouts without duplicating the action.

## Retries and Network Behavior

- Always inspect the `requestId` in the `meta` block to correlate logs if an error occurs.
- The API supports Rate Limiting. If you hit a limit, you will receive an HTTP `429 Too Many Requests` with a `resetAt` timestamp in the error details. Wait until that timestamp before retrying.
