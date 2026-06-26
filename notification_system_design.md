# Stage 1

# Notification System Design

## Table of Contents

1. [Overview](#1-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Authentication Assumptions](#3-authentication-assumptions)
4. [REST API Design Conventions](#4-rest-api-design-conventions)
5. [API Endpoints](#5-api-endpoints)
   - 5.1 [Get All Notifications](#51-get-all-notifications)
   - 5.2 [Get Notification by ID](#52-get-notification-by-id)
   - 5.3 [Mark Notification as Read](#53-mark-notification-as-read)
   - 5.4 [Mark All Notifications as Read](#54-mark-all-notifications-as-read)
   - 5.5 [Get Unread Notification Count](#55-get-unread-notification-count)
6. [JSON Schemas](#6-json-schemas)
7. [Pagination](#7-pagination)
8. [Filtering](#8-filtering)
9. [Error Handling](#9-error-handling)
10. [HTTP Status Codes](#10-http-status-codes)
11. [Real-Time Notification Architecture](#11-real-time-notification-architecture)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Assumptions](#13-assumptions)

---

## 1. Overview

This document defines the REST API contract for the **Campus Notification Platform** — a system that delivers contextual notifications to students across three domains: **Placements**, **Results**, and **Events**.

The API is designed to be consumed by a web frontend and a mobile client. It follows RESTful conventions, supports pagination and filtering, and is complemented by a real-time delivery mechanism using **Server-Sent Events (SSE)**.

**Base URL**

Deployment-specific. This document uses relative API paths only. Authentication is pre-handled; all requests carry a valid JWT issued by the authentication service.

---

## 2. Functional Requirements

| # | Requirement |
|---|-------------|
| FR-01 | Students can retrieve a paginated list of their notifications. |
| FR-02 | Students can retrieve a single notification by its unique identifier. |
| FR-03 | Students can mark an individual notification as read. |
| FR-04 | Students can mark all their notifications as read in a single operation. |
| FR-05 | Students can query the count of unread notifications. |
| FR-06 | Notifications can be filtered by type: `Placement`, `Result`, or `Event`. |
| FR-07 | Students receive new notifications in real time without polling. |
| FR-08 | The API returns consistent, structured error responses. |

---

## 3. Authentication Assumptions

- Authentication is already implemented and outside the scope of this design.
- Every API request must include a valid **Bearer token** in the `Authorization` header, issued by the existing auth service.
- The token is a signed **JWT** containing the authenticated user's identity (`user_id`, `role`).
- The server extracts `user_id` from the token to scope all data access — students only ever receive or modify their own notifications.
- No endpoint in this document accepts `user_id` as a request parameter; it is always derived server-side from the token.
- Token validation, expiry, and refresh are managed by the authentication layer, not this API.

**Required Header on all endpoints:**

```
Authorization: Bearer <jwt_token>
```

---

## 4. REST API Design Conventions

| Convention | Decision |
|---|---|
| API Style | REST |
| Resource naming | Plural nouns (`/notifications`) |
| HTTP verbs | `GET` for reads, `PATCH` for partial updates |
| Response format | JSON (`application/json`) |
| Date format | ISO 8601 (`2026-06-26T10:30:00Z`) |
| IDs | UUIDs (v4) |
| Casing | `snake_case` for all JSON keys |
| Errors | Uniform error envelope (see §9) |
| Versioning | URI path versioning (`/v1/`, `/v2/`, …) |

---

## 5. API Endpoints

### 5.1 Get All Notifications

**Purpose:** Retrieve a paginated, optionally filtered list of notifications for the authenticated student.

| Field | Value |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/notifications` |

#### Required Headers

| Header | Value |
|---|---|
| `Authorization` | `Bearer <jwt_token>` |
| `Accept` | `application/json` |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | integer | No | `1` | Page number (1-indexed). |
| `limit` | integer | No | `20` | Results per page. Max: `100`. |
| `notification_type` | string | No | — | Filter by type. Allowed: `Placement`, `Result`, `Event`. |
| `is_read` | boolean | No | — | Filter by read status. `true` or `false`. |

#### Request Body

None.

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "a3f1e290-4b72-4c1a-9b0f-d3e2f1c4a5b6",
        "title": "Software Engineer Placement Drive",
        "body": "An on-campus placement drive is scheduled for July 5th, 2026. Eligible branches: CSE, IT, ECE.",
        "notification_type": "Placement",
        "is_read": false,
        "created_at": "2026-06-25T09:00:00Z",
        "read_at": null
      },
      {
        "id": "b7c2d391-5e83-4d2b-8c1a-e4f3g2d5b6c7",
        "title": "Semester 6 Results Declared",
        "body": "Results for Semester 6 (Batch 2023–27) have been published. Log in to the academic portal to view your grades.",
        "notification_type": "Result",
        "is_read": true,
        "created_at": "2026-06-20T14:30:00Z",
        "read_at": "2026-06-20T15:10:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_items": 47,
      "total_pages": 3,
      "has_next_page": true,
      "has_previous_page": false
    }
  }
}
```

#### Error Responses

| Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `INVALID_QUERY_PARAM` | Invalid value for `notification_type` or `limit` exceeds maximum. |
| `401 Unauthorized` | `TOKEN_MISSING` | `Authorization` header is absent. |
| `401 Unauthorized` | `TOKEN_INVALID` | JWT is malformed or expired. |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Unexpected server failure. |

---

### 5.2 Get Notification by ID

**Purpose:** Retrieve the full details of a single notification by its unique ID.

| Field | Value |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/notifications/{notification_id}` |

#### Required Headers

| Header | Value |
|---|---|
| `Authorization` | `Bearer <jwt_token>` |
| `Accept` | `application/json` |

#### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `notification_id` | UUID (string) | Yes | The unique identifier of the notification. |

#### Query Parameters

None.

#### Request Body

None.

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "notification": {
      "id": "a3f1e290-4b72-4c1a-9b0f-d3e2f1c4a5b6",
      "title": "Software Engineer Placement Drive",
      "body": "An on-campus placement drive is scheduled for July 5th, 2026. Eligible branches: CSE, IT, ECE. Registration closes June 30th.",
      "notification_type": "Placement",
      "is_read": false,
      "metadata": {
        "drive_date": "2026-07-05",
        "eligible_branches": ["CSE", "IT", "ECE"],
        "registration_deadline": "2026-06-30"
      },
      "created_at": "2026-06-25T09:00:00Z",
      "read_at": null
    }
  }
}
```

#### Error Responses

| Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `INVALID_PATH_PARAM` | `notification_id` is not a valid UUID. |
| `401 Unauthorized` | `TOKEN_MISSING` / `TOKEN_INVALID` | Authentication failure. |
| `403 Forbidden` | `ACCESS_DENIED` | The notification does not belong to the authenticated student. |
| `404 Not Found` | `NOTIFICATION_NOT_FOUND` | No notification exists with the given ID. |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Unexpected server failure. |

---

### 5.3 Mark Notification as Read

**Purpose:** Mark a specific notification as read for the authenticated student.

| Field | Value |
|---|---|
| **Method** | `PATCH` |
| **Endpoint** | `/notifications/{notification_id}/read` |

#### Required Headers

| Header | Value |
|---|---|
| `Authorization` | `Bearer <jwt_token>` |
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |

#### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `notification_id` | UUID (string) | Yes | The unique identifier of the notification to mark as read. |

#### Query Parameters

None.

#### Request Body

None. The action is fully described by the endpoint and HTTP method.

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "notification": {
      "id": "a3f1e290-4b72-4c1a-9b0f-d3e2f1c4a5b6",
      "is_read": true,
      "read_at": "2026-06-26T11:45:00Z"
    }
  },
  "message": "Notification marked as read."
}
```

> If the notification is already marked as read, the server returns `200 OK` with the existing `read_at` timestamp — this operation is **idempotent**.

#### Error Responses

| Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `INVALID_PATH_PARAM` | `notification_id` is not a valid UUID. |
| `401 Unauthorized` | `TOKEN_MISSING` / `TOKEN_INVALID` | Authentication failure. |
| `403 Forbidden` | `ACCESS_DENIED` | The notification does not belong to the authenticated student. |
| `404 Not Found` | `NOTIFICATION_NOT_FOUND` | No notification exists with the given ID. |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Unexpected server failure. |

---

### 5.4 Mark All Notifications as Read

**Purpose:** Bulk-mark all unread notifications for the authenticated student as read in a single operation.

| Field | Value |
|---|---|
| **Method** | `PATCH` |
| **Endpoint** | `/notifications/read-all` |

#### Required Headers

| Header | Value |
|---|---|
| `Authorization` | `Bearer <jwt_token>` |
| `Accept` | `application/json` |

#### Path Parameters

None.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `notification_type` | string | No | — | Optionally restrict bulk-read to a specific type. Allowed: `Placement`, `Result`, `Event`. |

#### Request Body

None.

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "updated_count": 12
  },
  "message": "All notifications marked as read."
}
```

> If there are no unread notifications, `updated_count` will be `0` and the response is still `200 OK` — this operation is **idempotent**.

#### Error Responses

| Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `INVALID_QUERY_PARAM` | Invalid value for `notification_type`. |
| `401 Unauthorized` | `TOKEN_MISSING` / `TOKEN_INVALID` | Authentication failure. |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Unexpected server failure. |

---

### 5.5 Get Unread Notification Count

**Purpose:** Return the total count of unread notifications for the authenticated student. Intended for badge indicators in UI headers.

| Field | Value |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/notifications/unread-count` |

#### Required Headers

| Header | Value |
|---|---|
| `Authorization` | `Bearer <jwt_token>` |
| `Accept` | `application/json` |

#### Path Parameters

None.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `notification_type` | string | No | — | Optionally count only a specific type. Allowed: `Placement`, `Result`, `Event`. |

#### Request Body

None.

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "unread_count": 7,
    "breakdown": {
      "Placement": 3,
      "Result": 1,
      "Event": 3
    }
  }
}
```

> When `notification_type` is specified, `breakdown` is omitted and only the filtered `unread_count` is returned.

#### Error Responses

| Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `INVALID_QUERY_PARAM` | Invalid value for `notification_type`. |
| `401 Unauthorized` | `TOKEN_MISSING` / `TOKEN_INVALID` | Authentication failure. |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Unexpected server failure. |

---

## 6. JSON Schemas

### 6.1 Notification Object

This is the core resource returned by the API.

```json
{
  "title": "Notification",
  "type": "object",
  "required": ["id", "title", "body", "notification_type", "is_read", "created_at"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for the notification (UUID v4)."
    },
    "title": {
      "type": "string",
      "maxLength": 255,
      "description": "Short, descriptive title of the notification."
    },
    "body": {
      "type": "string",
      "maxLength": 2000,
      "description": "Full notification message content."
    },
    "notification_type": {
      "type": "string",
      "enum": ["Placement", "Result", "Event"],
      "description": "Category of the notification."
    },
    "is_read": {
      "type": "boolean",
      "description": "Whether the notification has been read by the student."
    },
    "metadata": {
      "type": "object",
      "description": "Optional type-specific structured data.",
      "additionalProperties": true
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp when the notification was created."
    },
    "read_at": {
      "type": ["string", "null"],
      "format": "date-time",
      "description": "ISO 8601 timestamp when the notification was read. Null if unread."
    }
  }
}
```

### 6.2 Standard Success Envelope

```json
{
  "title": "SuccessResponse",
  "type": "object",
  "required": ["success", "data"],
  "properties": {
    "success": {
      "type": "boolean",
      "enum": [true]
    },
    "data": {
      "type": "object",
      "description": "Endpoint-specific payload."
    },
    "message": {
      "type": "string",
      "description": "Optional human-readable message."
    }
  }
}
```

### 6.3 Pagination Object

```json
{
  "title": "Pagination",
  "type": "object",
  "required": ["current_page", "per_page", "total_items", "total_pages"],
  "properties": {
    "current_page": { "type": "integer", "minimum": 1 },
    "per_page": { "type": "integer", "minimum": 1, "maximum": 100 },
    "total_items": { "type": "integer", "minimum": 0 },
    "total_pages": { "type": "integer", "minimum": 0 },
    "has_next_page": { "type": "boolean" },
    "has_previous_page": { "type": "boolean" }
  }
}
```

---

## 7. Pagination

All list endpoints support offset-based pagination via query parameters.

| Parameter | Type | Default | Max | Description |
|---|---|---|---|---|
| `page` | integer | `1` | — | The page number to retrieve (1-indexed). |
| `limit` | integer | `20` | `100` | Number of results per page. |

**Example Request:**

```
GET /notifications?page=2&limit=10
```

**Pagination in Response:**

```json
"pagination": {
  "current_page": 2,
  "per_page": 10,
  "total_items": 47,
  "total_pages": 5,
  "has_next_page": true,
  "has_previous_page": true
}
```

**Rules:**
- If `page` is beyond the last page, an empty `notifications` array is returned with `200 OK`.
- If `limit` exceeds `100`, the API returns `400 Bad Request`.

---

## 8. Filtering

### By Notification Type

The `notification_type` query parameter filters results to a single category.

| Value | Description |
|---|---|
| `Placement` | Campus recruitment drives, job postings, interview schedules. |
| `Result` | Semester results, grade releases, re-evaluation outcomes. |
| `Event` | Fests, seminars, workshops, cultural or technical events. |

**Example:**

```
GET /notifications?notification_type=Placement
GET /notifications?notification_type=Event&page=1&limit=5
```

Supplying any value outside the allowed set returns:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY_PARAM",
    "message": "Invalid value for 'notification_type'. Allowed values are: Placement, Result, Event.",
    "field": "notification_type"
  }
}
```

---

## 9. Error Handling

All error responses follow a uniform envelope regardless of the HTTP status code.

### Standard Error Response Structure

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A human-readable description of the error.",
    "field": "query_param_or_field_name"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Always `false` for error responses. |
| `error.code` | string | Machine-readable error identifier. Stable across releases. |
| `error.message` | string | Human-readable explanation. May change between versions. |
| `error.field` | string \| null | The parameter or field that caused the error, if applicable. |

### Error Code Reference

| Code | HTTP Status | Description |
|---|---|---|
| `TOKEN_MISSING` | 401 | `Authorization` header is absent from the request. |
| `TOKEN_INVALID` | 401 | JWT is malformed, expired, or fails signature verification. |
| `ACCESS_DENIED` | 403 | The resource exists but does not belong to the authenticated student. |
| `NOTIFICATION_NOT_FOUND` | 404 | No notification found with the given ID. |
| `INVALID_QUERY_PARAM` | 400 | A query parameter has an invalid type or out-of-range value. |
| `INVALID_PATH_PARAM` | 400 | A path parameter (e.g. `notification_id`) is malformed. |
| `INTERNAL_ERROR` | 500 | An unexpected server-side error occurred. |

### Example Error Responses

**401 Unauthorized — Missing Token:**

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_MISSING",
    "message": "Authorization header is required.",
    "field": null
  }
}
```

**404 Not Found:**

```json
{
  "success": false,
  "error": {
    "code": "NOTIFICATION_NOT_FOUND",
    "message": "No notification found with id 'a3f1e290-4b72-4c1a-9b0f-d3e2f1c4a5b6'.",
    "field": "notification_id"
  }
}
```

**400 Bad Request — Invalid Filter:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY_PARAM",
    "message": "Invalid value for 'notification_type'. Allowed values are: Placement, Result, Event.",
    "field": "notification_type"
  }
}
```

---

## 10. HTTP Status Codes

| Code | Name | Usage in this API |
|---|---|---|
| `200 OK` | OK | Successful GET, or successful PATCH (including idempotent no-op). |
| `400 Bad Request` | Bad Request | Malformed request: invalid query parameters, path parameters, or request body. |
| `401 Unauthorized` | Unauthorized | Missing or invalid JWT token. Client must re-authenticate. |
| `403 Forbidden` | Forbidden | Token is valid, but the student is not permitted to access the resource. |
| `404 Not Found` | Not Found | The requested resource does not exist. |
| `500 Internal Server Error` | Internal Server Error | Unhandled server-side failure. Client should not retry without delay. |

---

## 11. Real-Time Notification Architecture

### 11.1 Approach: Server-Sent Events (SSE)

**Server-Sent Events (SSE)** is selected as the real-time transport over WebSockets for the following reasons:

| Factor | SSE | WebSockets |
|---|---|---|
| Communication direction | Server → Client (unidirectional) | Bidirectional |
| Use case fit | Push-only notifications | Chat, collaborative editing |
| Protocol | HTTP/1.1, HTTP/2 | Separate WS protocol |
| Built-in reconnect | Yes (browser-native) | Must be implemented manually |
| Proxy/firewall compatibility | High | Lower |
| Complexity | Low | Higher |

Since notification delivery is inherently server-to-client, SSE is the right tool and avoids unnecessary protocol complexity.

### 11.2 SSE Endpoint

| Field | Value |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/notifications/stream` |

#### Required Headers (Client → Server)

| Header | Value |
|---|---|
| `Authorization` | `Bearer <jwt_token>` |
| `Accept` | `text/event-stream` |
| `Cache-Control` | `no-cache` |

#### Response Headers (Server → Client)

| Header | Value |
|---|---|
| `Content-Type` | `text/event-stream` |
| `Cache-Control` | `no-cache` |
| `Connection` | `keep-alive` |

### 11.3 Connection Establishment

```
Client                                    Server
  |                                          |
  |  GET /notifications/stream               |
  |  Authorization: Bearer <token>           |
  |  Accept: text/event-stream               |
  | ---------------------------------------->|
  |                                          | Validate JWT
  |                                          | Register client in channel map
  |  HTTP 200 OK                             |
  |  Content-Type: text/event-stream         |
  |<-----------------------------------------|
  |                                          |
  |  [Connection held open, events stream]   |
  |<-----------------------------------------|
```

1. The client opens an HTTP GET request with `Accept: text/event-stream`.
2. The server validates the JWT and extracts `user_id`.
3. The server registers the connection in an in-memory channel map keyed by `user_id`.
4. The HTTP connection is held open; the server streams events as they occur.

### 11.4 SSE Event Format

Each event conforms to the SSE specification:

```
id: <event_id>
event: <event_type>
data: <json_payload>
retry: 5000

```

**Example — New Notification Event:**

```
id: evt_001
event: new_notification
data: {"id":"a3f1e290-4b72-4c1a-9b0f-d3e2f1c4a5b6","title":"Software Engineer Placement Drive","notification_type":"Placement","is_read":false,"created_at":"2026-06-26T10:00:00Z"}
retry: 5000

```

**Example — Keepalive Ping (every 25 seconds):**

```
event: ping
data: {"timestamp":"2026-06-26T10:00:25Z"}

```

The server sends a `ping` event every 25 seconds to keep the connection alive through proxies and load balancers that close idle connections.

### 11.5 Event Types

| Event | Description |
|---|---|
| `new_notification` | A new notification has been created for the student. |
| `notification_read` | A specific notification was marked as read (for multi-tab sync). |
| `all_read` | All notifications were bulk-marked as read. |
| `ping` | Keepalive heartbeat; client ignores data. |

### 11.6 Client-Side Reconnect Strategy

SSE provides **automatic reconnection** natively in all modern browsers via the `EventSource` API. The `retry` field (in milliseconds) instructs the browser how long to wait before reconnecting after a dropped connection.

```
retry: 5000
```

The server also returns the `Last-Event-ID` via the `id` field on each event. On reconnect, the browser sends:

```
Last-Event-ID: evt_001
```

The server uses this to replay any missed events since the last received ID, ensuring zero message loss on transient disconnects.

**Reconnect behaviour:**

| Scenario | Behaviour |
|---|---|
| Network drop | Browser auto-reconnects after 5 seconds. |
| Server restart | Client reconnects; server replays missed events using `Last-Event-ID`. |
| JWT expiry | Server closes stream with HTTP `401`; client redirects to re-authenticate. |
| Explicit disconnect | Client calls `EventSource.close()`; no reconnect. |

### 11.7 Scalability Considerations

The SSE stream is tied to a single HTTP connection per user. For a campus-scale deployment this works fine with a single server instance. If the platform needs to scale horizontally in the future, the standard approach is to introduce a message bus (e.g. a pub/sub channel) between backend instances so that any node can receive a notification event and forward it to the correct connected client. The API contract and client behaviour remain unchanged regardless of how the backend is scaled.

---

## 12. Non-Functional Requirements

### 12.1 Scalability

- The REST API is **stateless**; any instance can serve any request, enabling horizontal scaling behind a load balancer.
- The SSE stream design supports horizontal scaling as described in §11.7 without any changes to the client or API contract.

### 12.2 Reliability

- The SSE `retry` directive and `Last-Event-ID` tracking ensure **at-least-once delivery** on reconnect.
- Notification creation should be transactional — a notification is either fully persisted and published, or neither.

### 12.3 Security

- All endpoints require a valid JWT; user data is strictly scoped by `user_id` extracted server-side.
- The `403 Forbidden` response prevents cross-student data access without leaking whether a resource exists.
- The SSE endpoint validates the JWT on connection; an expired token closes the stream with `401`.
- All traffic is served over **HTTPS/TLS**. HTTP requests are redirected to HTTPS.
- Rate limiting is applied per `user_id` on the SSE endpoint to prevent connection exhaustion.

### 12.4 Performance

| Target | Goal |
|---|---|
| P95 REST response time | < 100ms |
| SSE event delivery latency | < 500ms from creation to client receipt |
| Pagination default | 20 items per page |

### 12.5 API Versioning

- The API uses **URI path versioning** (e.g. `/v1/`, `/v2/`).
- Breaking changes (field removal, type changes, endpoint removal) require a new version prefix.
- Non-breaking additions (new optional fields, new endpoints) may be introduced in the current version without a version bump.
- Deprecated endpoints will be documented with a `Deprecation` response header and supported for a minimum of **6 months** before removal.

---

## 13. Assumptions

| # | Assumption |
|---|---|
| A-01 | Authentication and user management are handled by a separate service. This API trusts and validates JWTs issued by that service. |
| A-02 | Notifications are created by an internal admin or automated system (e.g. results service, placement portal). Student-facing creation is out of scope. |
| A-03 | A single student maps to a single `user_id` in the JWT. Multi-account scenarios are not considered. |
| A-04 | Notifications are soft-deleted only; once created, they persist in the database. |
| A-05 | The `metadata` field is a flexible, type-specific JSON object. Its schema is not enforced at the API layer. |
| A-06 | Pagination is offset-based. Cursor-based pagination can be introduced in a future version if the dataset grows large enough that offset performance degrades. |
| A-07 | The platform targets modern browsers that natively support the `EventSource` SSE API. |
| A-08 | The `notification_type` enum is stable for Stage 1. Additional types can be introduced via a non-breaking API update. |
| A-09 | All timestamps are stored and returned in UTC (ISO 8601). Timezone conversion is the responsibility of the client. |

---

*End of Stage 1 — API Design Document*