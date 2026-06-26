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

---
 
# Stage 2
 
 
## Table of Contents
 
1. [Database Selection](#1-database-selection)
2. [Database Schema](#2-database-schema)
3. [Relationships](#3-relationships)
4. [Indexing Strategy](#4-indexing-strategy)
5. [Scalability Challenges](#5-scalability-challenges)
6. [Performance Improvements](#6-performance-improvements)
7. [Queries](#7-queries)
8. [Assumptions](#8-assumptions)
---
 
## 1. Database Selection
 
**Selected Database: PostgreSQL (Relational / SQL)**
 
### Decision
 
PostgreSQL is the right choice for this system. The data is structured and well-defined, the relationships between users and notifications are clear and consistent, and every Stage 1 API maps naturally to a SQL query. There is no ambiguity in the shape of a notification record, no need for variable document structure, and no write pattern that benefits from document-oriented storage.
 
### Justification
 
| Criteria | PostgreSQL | MongoDB |
|---|---|---|
| Data structure | Fixed schema — notification fields are stable and fully known | Flexible schema — useful when fields vary unpredictably per document |
| Query patterns | `WHERE user_id = ? AND is_read = false ORDER BY created_at DESC` — SQL is purpose-built for this | Requires index design and aggregation pipelines for equivalent queries |
| Relationships | `user_id` foreign key enforces referential integrity natively | Referential integrity must be managed in application code |
| Transactions | Native ACID — bulk mark-all-read is a single atomic UPDATE | Multi-document transactions exist but add complexity |
| Unread count | `SELECT COUNT(*)` with an index is fast and simple | Equivalent requires a `countDocuments` call with the same index overhead |
| `metadata` column | `JSONB` stores flexible, type-specific metadata with indexing support | Native document, but not meaningfully better than JSONB for this use case |
| Operational maturity | Well-understood tooling, managed offerings, extensive community | Strong ecosystem but adds complexity that is not justified here |
 
The `metadata` field (used for type-specific data like drive dates or event venues) is handled cleanly using PostgreSQL's `JSONB` column type, which supports indexing on nested keys if needed later. This means there is no trade-off on flexibility.
 
The conclusion is straightforward: the data is relational, the queries are predictable, and PostgreSQL handles all Stage 1 requirements with less operational overhead than a NoSQL alternative.
 
---
 
## 2. Database Schema
 
The schema consists of two tables. The `users` table is managed by the existing authentication service and is referenced here as a foreign key dependency. The `notifications` table is the core table owned by this service.
 
### 2.1 `users` Table
 
This table is maintained by the authentication service. It is included here only to document the foreign key relationship. This service does not write to it.
 
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Unique user identifier, generated by the auth service. |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | Student email address. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Account creation timestamp. |
 
### 2.2 `notifications` Table
 
This is the primary table owned by the notification service.
 
| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | `gen_random_uuid()` | Unique notification identifier (UUID v4). |
| `user_id` | `UUID` | `NOT NULL`, `FOREIGN KEY → users(id) ON DELETE CASCADE` | — | The student this notification belongs to. |
| `title` | `VARCHAR(255)` | `NOT NULL` | — | Short title of the notification. |
| `body` | `TEXT` | `NOT NULL` | — | Full notification message content. |
| `notification_type` | `VARCHAR(20)` | `NOT NULL`, `CHECK (notification_type IN ('Placement', 'Result', 'Event'))` | — | Category of the notification. |
| `is_read` | `BOOLEAN` | `NOT NULL` | `FALSE` | Whether the student has read this notification. |
| `metadata` | `JSONB` | `NULL` | `NULL` | Optional type-specific structured data (e.g. drive date, event venue). |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | UTC timestamp when the notification was created. |
| `read_at` | `TIMESTAMPTZ` | `NULL` | `NULL` | UTC timestamp when the notification was read. `NULL` if unread. |
 
### 2.3 DDL
 
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 
CREATE TABLE users (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR(255)  NOT NULL UNIQUE,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
 
CREATE TABLE notifications (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID          NOT NULL
                                    REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255)  NOT NULL,
    body              TEXT          NOT NULL,
    notification_type VARCHAR(20)   NOT NULL
                                    CHECK (notification_type IN ('Placement', 'Result', 'Event')),
    is_read           BOOLEAN       NOT NULL DEFAULT FALSE,
    metadata          JSONB,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    read_at           TIMESTAMPTZ
);
```
 
---
 
## 3. Relationships
 
```
users
  id  ──────────────────────────────────────┐
                                             │ (one-to-many)
notifications                                │
  id            PK                           │
  user_id       FK ──────────────────────────┘
  title
  body
  notification_type
  is_read
  metadata
  created_at
  read_at
```
 
| Relationship | Cardinality | Description |
|---|---|---|
| `users` → `notifications` | One-to-Many | A single student can have many notifications. Each notification belongs to exactly one student. |
 
**Cascade behaviour:** `ON DELETE CASCADE` on `notifications.user_id` ensures that if a user account is deleted, all their notifications are automatically removed. This avoids orphaned rows and keeps the table clean without requiring a separate cleanup job.
 
---
 
## 4. Indexing Strategy
 
Indexes are the primary lever for keeping queries fast as the notifications table grows. Every index below directly supports one or more of the Stage 1 API queries.
 
### Index Definitions
 
```sql
-- Index 1: Fetch all notifications for a user, newest first
CREATE INDEX idx_notifications_user_created
    ON notifications (user_id, created_at DESC);
 
-- Index 2: Count or filter unread notifications for a user
CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, is_read)
    WHERE is_read = FALSE;
 
-- Index 3: Filter by notification type for a specific user
CREATE INDEX idx_notifications_user_type
    ON notifications (user_id, notification_type);
 
-- Index 4: Composite index for filtered + sorted list queries
CREATE INDEX idx_notifications_user_type_created
    ON notifications (user_id, notification_type, created_at DESC);
```
 
### Index Rationale
 
| Index | Columns | Purpose |
|---|---|---|
| `idx_notifications_user_created` | `(user_id, created_at DESC)` | Covers the default paginated list query — filter by user, sort by newest first. Without this, a full table scan occurs for every list request. |
| `idx_notifications_user_unread` | `(user_id, is_read)` WHERE `is_read = FALSE` | Partial index that only stores unread rows. Keeps the index small and makes unread-count and mark-all-read queries fast even when a user has thousands of historical read notifications. |
| `idx_notifications_user_type` | `(user_id, notification_type)` | Supports filtering by type. Without this, filtering by `Placement` or `Event` on a large user dataset requires scanning all of that user's rows. |
| `idx_notifications_user_type_created` | `(user_id, notification_type, created_at DESC)` | Covers the combined filter-and-sort case: `/notifications?notification_type=Placement&page=2`. Avoids a sort step after filtering. |
 
The primary key index on `id` is created automatically by PostgreSQL and covers `GET /notifications/{id}` lookups.
 
---
 
## 5. Scalability Challenges
 
As the platform grows from hundreds of students to tens of thousands, and from thousands of notifications to millions, several predictable problems emerge.
 
### 5.1 Offset Pagination Degrades at Scale
 
The current pagination design uses `LIMIT` and `OFFSET`. The problem is that `OFFSET 10000 LIMIT 20` forces PostgreSQL to read and discard 10,000 rows before returning the 20 it needs. At high page numbers, this becomes progressively slower regardless of indexes.
 
**When it hurts:** A student who has accumulated years of notifications and navigates to page 50+ will experience noticeably slower responses.
 
### 5.2 `COUNT(*)` Becomes Expensive
 
The `GET /notifications/unread-count` endpoint runs a `COUNT(*)` on every request. On a table with millions of rows, even with an index, this query touches every matching row to produce a single number. If a high-traffic dashboard polls this endpoint frequently, it becomes a hot query.
 
### 5.3 Table Size and Query Latency
 
A single `notifications` table that stores all historical notifications for all users will grow large over time. Even with indexes, very large tables have higher index traversal costs, slower vacuum operations, and larger index sizes on disk.
 
### 5.4 Write Contention on Mark-All-Read
 
The `PATCH /notifications/read-all` query issues a bulk `UPDATE` on potentially many rows for a single user. On a high-concurrency system, many simultaneous bulk updates across different users can cause lock contention.
 
### 5.5 Hot User Rows
 
Some notification types (system-wide announcements broadcast to all students) will insert a large number of rows simultaneously. If notifications are personalised copies per user, a broadcast to 5,000 students is a bulk insert of 5,000 rows at once, which can spike write latency.
 
---
 
## 6. Performance Improvements
 
Each challenge from §5 has a practical solution.
 
### 6.1 Replace Offset Pagination with Keyset Pagination
 
Instead of `OFFSET`, use the `created_at` and `id` of the last seen row as a cursor. The query becomes:
 
```sql
WHERE user_id = $1
  AND created_at < $last_seen_created_at
ORDER BY created_at DESC
LIMIT 20;
```
 
This always reads exactly 20 rows regardless of how deep into the history the user is, and uses the existing index efficiently.
 
The API response would include a `next_cursor` token (an opaque base64-encoded value of `created_at:id`) instead of `total_pages`. This is a non-breaking addition in a future API version.
 
### 6.2 Cache the Unread Count
 
The unread count is read far more often than it changes. A simple cache key of `unread_count:{user_id}` can be stored in memory (or any key-value store) and invalidated whenever a notification is created, read, or bulk-read. The count query then only runs on a cache miss, which is rare for active users.
 
### 6.3 Archival Strategy
 
Notifications older than a defined retention window (e.g. 12 months) can be moved to an archive table or cold storage. The active `notifications` table stays lean, indexes stay small, and query performance remains consistent. Archived notifications can still be accessible via a separate `GET /notifications/archive` endpoint if needed.
 
```sql
-- Example: archive notifications older than 12 months
INSERT INTO notifications_archive SELECT * FROM notifications
    WHERE created_at < NOW() - INTERVAL '12 months';
 
DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '12 months';
```
 
### 6.4 Table Partitioning
 
Once the table is very large, PostgreSQL range partitioning by `created_at` (e.g. one partition per month or quarter) keeps individual partition sizes manageable. Queries that filter by date range only scan the relevant partition rather than the full table.
 
```sql
-- Conceptual partitioning by year
CREATE TABLE notifications (...)
    PARTITION BY RANGE (created_at);
 
CREATE TABLE notifications_2025
    PARTITION OF notifications
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
 
CREATE TABLE notifications_2026
    PARTITION OF notifications
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```
 
### 6.5 Horizontal Scaling via Read Replicas
 
The majority of traffic to this service is reads (`GET /notifications`, `GET /unread-count`). Directing all read queries to one or more read replicas while routing writes (INSERT, UPDATE) to the primary database distributes load effectively without changing the API contract.
 
### Summary
 
| Problem | Solution |
|---|---|
| Deep pagination slowness | Keyset pagination using `created_at` cursor |
| Frequent `COUNT(*)` cost | Cache unread count, invalidate on write |
| Table growth and bloat | Archival of old notifications, vacuum tuning |
| Very large table scan cost | Range partitioning by `created_at` |
| Read-heavy traffic | Read replicas for all GET queries |
| Broadcast write spikes | Async notification fan-out via a queue |
 
---
 
## 7. Queries
 
The queries below map directly to the five Stage 1 REST API endpoints. All queries assume `$user_id` is extracted server-side from the JWT and never passed by the client.
 
### 7.1 Fetch Notifications (GET /notifications)
 
**Default — paginated, newest first:**
 
```sql
SELECT
    id,
    title,
    body,
    notification_type,
    is_read,
    metadata,
    created_at,
    read_at
FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2
OFFSET $3;
```
 
**With `notification_type` filter:**
 
```sql
SELECT
    id,
    title,
    body,
    notification_type,
    is_read,
    metadata,
    created_at,
    read_at
FROM notifications
WHERE user_id = $1
  AND notification_type = $2
ORDER BY created_at DESC
LIMIT $3
OFFSET $4;
```
 
**With `is_read` filter:**
 
```sql
SELECT
    id,
    title,
    body,
    notification_type,
    is_read,
    metadata,
    created_at,
    read_at
FROM notifications
WHERE user_id = $1
  AND is_read = $2
ORDER BY created_at DESC
LIMIT $3
OFFSET $4;
```
 
**Total count for pagination metadata:**
 
```sql
SELECT COUNT(*) AS total_items
FROM notifications
WHERE user_id = $1;
-- Add AND notification_type = $2 if filter is active
```
 
---
 
### 7.2 Fetch One Notification (GET /notifications/{notification_id})
 
```sql
SELECT
    id,
    title,
    body,
    notification_type,
    is_read,
    metadata,
    created_at,
    read_at
FROM notifications
WHERE id = $1
  AND user_id = $2;
```
 
The `AND user_id = $2` check enforces ownership. If the row exists but belongs to a different user, no row is returned and the API responds with `403 Forbidden`. If no row is found at all, the API responds with `404 Not Found`.
 
---
 
### 7.3 Mark Notification as Read (PATCH /notifications/{notification_id}/read)
 
```sql
UPDATE notifications
SET
    is_read = TRUE,
    read_at = CASE
                  WHEN is_read = FALSE THEN NOW()
                  ELSE read_at
              END
WHERE id = $1
  AND user_id = $2
RETURNING id, is_read, read_at;
```
 
The `CASE` expression preserves the original `read_at` timestamp if the notification was already read, making the operation idempotent. The `RETURNING` clause lets the application send the updated values back in the response without a second query.
 
---
 
### 7.4 Mark All Notifications as Read (PATCH /notifications/read-all)
 
**All unread notifications:**
 
```sql
UPDATE notifications
SET
    is_read = TRUE,
    read_at = NOW()
WHERE user_id = $1
  AND is_read = FALSE;
```
 
**Filtered to a specific type:**
 
```sql
UPDATE notifications
SET
    is_read = TRUE,
    read_at = NOW()
WHERE user_id = $1
  AND is_read = FALSE
  AND notification_type = $2;
```
 
To return the count of updated rows (for the `updated_count` response field), the application reads `rowCount` from the query result — no extra `SELECT` is needed.
 
---
 
### 7.5 Count Unread Notifications (GET /notifications/unread-count)
 
**Total unread count with per-type breakdown:**
 
```sql
SELECT
    notification_type,
    COUNT(*) AS count
FROM notifications
WHERE user_id = $1
  AND is_read = FALSE
GROUP BY notification_type;
```
 
The application aggregates this result to produce both `unread_count` (sum of all counts) and the `breakdown` object in the response. A single query replaces what would otherwise be four separate count queries.
 
**Filtered to a single type:**
 
```sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = $1
  AND is_read = FALSE
  AND notification_type = $2;
```
 
---
 
## 8. Assumptions
 
| # | Assumption |
|---|---|
| B-01 | The `users` table is owned and managed by the existing authentication service. This service only holds a `user_id` reference and does not join against `users` in any notification query. |
| B-02 | Notifications are never updated after creation except for `is_read` and `read_at`. All other fields are immutable. |
| B-03 | Notifications are never hard-deleted by the student. The retention and archival policy is defined at the infrastructure level, not exposed via the API. |
| B-04 | The `metadata` column stores valid JSON only. Validation of its contents is the responsibility of the service that creates notifications, not the read API. |
| B-05 | Each notification is a private copy belonging to one student. Broadcast notifications (sent to all students) are expanded into individual rows at write time, one per recipient. |
| B-06 | The `notification_type` values (`Placement`, `Result`, `Event`) are enforced at the database level via a `CHECK` constraint, mirroring the API-level validation. |
| B-07 | All timestamps are stored in UTC using `TIMESTAMPTZ`. The database server timezone is configured to UTC. |
| B-08 | PostgreSQL 14 or later is assumed. `gen_random_uuid()` is available via the `pgcrypto` extension. |
 
---
 
*End of Stage 2 — Database Design Document*

---

# Stage 3
 
# Notification System — Query Analysis & Optimization
 
## Query Analysis
 
The query under review is:
 
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```
 
**Is it functionally correct?**
 
The intent is correct — fetch all unread notifications for a specific student, ordered oldest first. However, the query as written will not execute successfully against the schema defined in Stage 2. There are three column name mismatches:
 
| Query Column | Stage 2 Column | Issue |
|---|---|---|
| `studentID` | `user_id` | Wrong name and convention. Stage 2 uses `snake_case`. |
| `isRead` | `is_read` | camelCase used instead of `snake_case`. |
| `createdAt` | `created_at` | camelCase used instead of `snake_case`. |
 
PostgreSQL column names are case-insensitive when unquoted, but `studentID` as a logical name simply does not exist — the column is called `user_id`. This query would throw an `ERROR: column "studentid" does not exist` at runtime.
 
Additionally, the value `1042` is an integer literal, but `user_id` in Stage 2 is a `UUID`. The correct value must be a UUID string such as `'a3f1e290-4b72-4c1a-9b0f-d3e2f1c4a5b6'`. This likely reflects an older schema design where user IDs were auto-incrementing integers rather than UUIDs.
 
The corrected query using Stage 2 column names is:
 
```sql
SELECT * FROM notifications
WHERE user_id = 'a3f1e290-4b72-4c1a-9b0f-d3e2f1c4a5b6'
  AND is_read = false
ORDER BY created_at ASC;
```
 
Even after correcting column names, this query has significant performance problems at scale.
 
---
 
## Why the Query is Slow
 
At 50,000 students and 5,000,000 notifications, this query is slow for several compounding reasons.
 
**1. No usable index — full table scan**
 
Without an index on `(user_id, is_read)`, PostgreSQL has no choice but to read every row in the `notifications` table to find the ones that match. On a 5,000,000-row table, that is a sequential scan of potentially hundreds of thousands of data pages. This is the dominant cost.
 
**2. `SELECT *` reads every column unnecessarily**
 
The query fetches all columns including `body` (TEXT, potentially long), `metadata` (JSONB), and `read_at` — most of which the caller likely does not need. PostgreSQL must read the full row from heap storage for each match, rather than satisfying the query from a covering index alone. This inflates I/O significantly.
 
**3. Post-filter sort on an unindexed column**
 
`ORDER BY created_at ASC` runs after filtering. If there is no index that already delivers rows in `created_at` order for a given user, PostgreSQL must collect all matching rows in memory and then sort them. On a student with hundreds of unread notifications, this sort is cheap — but without indexing, the cost of reaching that point (the full scan) is already unacceptable.
 
**4. No pagination**
 
`SELECT *` with no `LIMIT` returns every unread notification in one response. A student who has never opened the app could have thousands of unread rows. Fetching, sorting, serialising, and transmitting all of them in a single query is wasteful and slow regardless of indexing.
 
**5. Large table, no partitioning**
 
A single flat table of 5,000,000 rows with no archival or partitioning means every query operates against the full dataset. Even with an index, the index itself is large and may not fit entirely in memory, causing additional disk reads during traversal.
 
---
 
## Optimized Query
 
**Step 1 — Fix column names and use correct types:**
 
```sql
SELECT
    id,
    title,
    notification_type,
    created_at,
    read_at
FROM notifications
WHERE user_id  = $1
  AND is_read  = false
ORDER BY created_at ASC
LIMIT 20
OFFSET 0;
```
 
**Step 2 — Create the supporting index:**
 
```sql
-- Partial composite index: only unread rows, ordered by creation time
CREATE INDEX idx_notifications_user_unread_created
    ON notifications (user_id, created_at ASC)
    WHERE is_read = false;
```
 
**What changed and why:**
 
| Change | Reason |
|---|---|
| Replaced `SELECT *` with specific columns | Avoids reading `body` (TEXT) and `metadata` (JSONB) from heap storage when they are not needed. Reduces I/O per row. |
| Added `LIMIT 20 OFFSET 0` | Prevents fetching the entire unread history in one query. Returns a usable, bounded result set. |
| `ORDER BY created_at ASC` kept | Oldest-first ordering is preserved as originally intended. The partial index delivers rows pre-sorted, eliminating the sort step. |
| Parameterised `$1` for `user_id` | Avoids query plan cache misses and prevents SQL injection. |
| Partial index on `(user_id, created_at ASC) WHERE is_read = false` | Index only stores unread rows. As notifications are marked read, they leave the index automatically. The index stays small over time even as the table grows. |
 
If `notification_type` filtering is also needed (as per Stage 1 API requirements), extend the index:
 
```sql
CREATE INDEX idx_notifications_user_type_unread_created
    ON notifications (user_id, notification_type, created_at ASC)
    WHERE is_read = false;
```
 
And the query becomes:
 
```sql
SELECT id, title, notification_type, created_at, read_at
FROM notifications
WHERE user_id           = $1
  AND notification_type = $2
  AND is_read           = false
ORDER BY created_at ASC
LIMIT 20
OFFSET 0;
```
 
---
 
## Computational Cost
 
**Without any index:**
 
PostgreSQL performs a sequential scan of the entire `notifications` table. Every one of the 5,000,000 rows is read and evaluated against the `WHERE` clause. This is **O(N)** where N is the total row count. At 5 million rows, this means reading potentially thousands of 8KB data pages from disk on every request. Response times in the range of seconds are expected. Under concurrent load, this saturates disk I/O quickly.
 
**With the partial composite index `(user_id, created_at ASC) WHERE is_read = false`:**
 
PostgreSQL uses a B-tree index scan. It navigates the index in **O(log N)** time to find the first entry for the given `user_id`, then reads only the contiguous index entries for that user's unread notifications in order. With `LIMIT 20`, it stops after retrieving 20 rows — it never touches the rest of the table.
 
In practical terms:
- Index lookup: a few milliseconds regardless of table size.
- Heap fetch for 20 rows: negligible.
- Sort step: eliminated entirely (index already delivers rows in `created_at ASC` order).
- Total: response times consistently under 10ms for a typical student's unread notifications, even at 5 million total rows.
| Scenario | Scan Type | Approximate Cost |
|---|---|---|
| No index, no limit | Full sequential scan | O(N) — degrades linearly with table size |
| With partial index, LIMIT 20 | Index scan + 20 heap fetches | O(log N) — effectively constant at scale |
 
---
 
## Should Every Column be Indexed?
 
No. Adding an index on every column is a common and costly mistake. Here is why.
 
**Storage overhead**
 
Each index is a separate B-tree data structure stored on disk. For a table with 5,000,000 rows and 9 columns, indexing every column could multiply storage usage by 3–5x. The `body` (TEXT) and `metadata` (JSONB) columns alone would produce enormous index structures with limited utility.
 
**Slower writes**
 
Every `INSERT`, `UPDATE`, and `DELETE` must update all indexes on the affected table, not just the ones relevant to the operation. Indexing every column means a single notification insert — which currently writes one row and updates 1–2 indexes — now writes one row and updates 9 indexes. Write throughput drops proportionally.
 
**Query planner confusion**
 
PostgreSQL's query planner evaluates available indexes when building an execution plan. Giving it many irrelevant indexes increases planning time and can lead the planner to choose a less efficient plan. More indexes is not always better guidance for the planner — it is noise.
 
**Indexes are only valuable when selective**
 
A boolean column like `is_read` has two possible values. A standalone index on `is_read` is nearly useless because it cannot narrow down the result set meaningfully — roughly half the table could match either value. Indexes deliver value when they are selective (high cardinality) and when they match actual query patterns.
 
**The right approach:** create indexes that reflect the queries you run. Look at your `WHERE` clauses, `ORDER BY` columns, and join keys. Index those combinations, and nothing else.
 
---
 
## SQL Query: Students Receiving Placement Notifications in the Last 7 Days
 
This query returns all distinct students who received at least one `Placement` notification within the last 7 days, along with the count of such notifications per student.
 
```sql
SELECT
    n.user_id,
    u.email,
    COUNT(*)            AS placement_notification_count,
    MAX(n.created_at)   AS most_recent_at
FROM notifications n
JOIN users u ON u.id = n.user_id
WHERE n.notification_type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days'
GROUP BY n.user_id, u.email
ORDER BY most_recent_at DESC;
```
 
**Notes:**
 
- `NOW() - INTERVAL '7 days'` is PostgreSQL-native and evaluates at query time. No application-side date arithmetic is needed.
- The `JOIN` on `users` retrieves the student's email for readability. If only `user_id` is needed, the join can be dropped entirely.
- `GROUP BY n.user_id, u.email` returns one row per student with the total count of placement notifications they received in the window.
- `ORDER BY most_recent_at DESC` surfaces the most recently notified students first.
**Supporting index for this query:**
 
The following index from Stage 2 already covers this query efficiently:
 
```sql
CREATE INDEX idx_notifications_user_type_created
    ON notifications (user_id, notification_type, created_at DESC);
```
 
PostgreSQL will use this index to satisfy both the `notification_type = 'Placement'` filter and the `created_at >= NOW() - INTERVAL '7 days'` range filter in a single index scan, without touching rows outside the time window.
 
---
 
## Summary
 
| Question | Answer |
|---|---|
| Is the query correct? | Functionally intended but broken — three column names do not match the Stage 2 schema. `studentID` should be `user_id`, `isRead` should be `is_read`, `createdAt` should be `created_at`. |
| Why is it slow? | No index on `(user_id, is_read)` forces a full sequential scan of 5,000,000 rows. `SELECT *` reads large columns unnecessarily. No `LIMIT` fetches unbounded results. |
| How to fix it? | Add a partial composite index on `(user_id, created_at ASC) WHERE is_read = false`. Select only needed columns. Add `LIMIT` for pagination. |
| Computational cost? | Without index: O(N) — scales badly. With the right partial index and `LIMIT`: O(log N) — effectively constant at scale. |
| Index every column? | No. Adds storage overhead, slows writes, confuses the query planner, and provides no benefit for low-cardinality or rarely-queried columns. |
| Placement query | Join `notifications` and `users`, filter `notification_type = 'Placement'` and `created_at >= NOW() - INTERVAL '7 days'`, group by student. |
 
---
 
*End of Stage 3 — Query Analysis & Optimization*
 