# PRD — Self-Hosted Real-Time Chat & Voice Calling Platform

## React Web + Android App

---

# 1. Project Overview

## Product Name

PulseChat (placeholder)

## Goal

Build a self-hosted, scalable, real-time messaging and voice calling platform with:

* Real-time chat
* Voice calling
* Authentication
* Group chat
* Push notifications
* Media sharing
* Online presence
* Modern responsive UI
* Android app + Web app
* Admin dashboard
* Production-ready architecture

The system should support:

* Personal messaging
* Group communication
* Future SIP/AI integrations
* Future video calling
* Future AI assistant features

---

# 2. Core Features

## Authentication

* Email/password login
* OTP login
* JWT authentication
* Refresh tokens
* Session management
* Device management
* Password reset

---

## User System

* User profiles
* Profile image
* Username
* Bio/status
* Last seen
* Online/offline presence

---

## Real-Time Messaging

* 1-to-1 chat
* Group chat
* Typing indicators
* Message reactions
* Read receipts
* Delivered status
* Real-time sync

---

## Voice Calling

* One-to-one voice calls
* Incoming call UI
* Call accept/reject
* Mute/unmute
* Speaker switching
* Call timer
* ICE candidate exchange
* WebRTC support

---

## Notifications

* Push notifications
* Missed call notifications
* Message notifications
* Background notifications

---

## Media Support

* Image upload
* File upload
* Voice notes
* Compression support

---

## Admin Dashboard

* User management
* Ban/suspend users
* View active users
* Monitor server metrics
* Logs and moderation

---

# 3. Platform Targets

## Web App

* React
* Responsive design
* PWA support

## Android App

* React Native
* Expo or bare React Native

---

# 4. Recommended Tech Stack

# Frontend

## Web

### Framework

* React
* Vite

### UI

* TailwindCSS
* Shadcn UI

### State Management

* Zustand

### Realtime

* Socket.IO Client

### Calling

* WebRTC

---

## Mobile

### Framework

* React Native

### Navigation

* React Navigation

### Notifications

* Firebase Cloud Messaging

### Calling

* react-native-webrtc

---

# Backend

## Runtime

* Node.js

## Framework

* Fastify

## Real-Time Engine

* Socket.IO

## Authentication

* JWT
* Refresh tokens

## Validation

* Zod

## ORM

* Prisma

---

# Database

## Main DB

* PostgreSQL

---

# Cache / Realtime Presence

## Redis

Used for:

* Socket sessions
* Presence
* Scaling
* Queues

---

# File Storage

## Self Hosted

* MinIO

Alternative:

* S3-compatible object storage

---

# Voice Calling Stack

## Calling Engine

* WebRTC

## TURN/STUN

* Coturn

---

# Reverse Proxy

## Nginx

Used for:

* SSL
* Routing
* Load balancing
* WebSocket proxying

---

# Containerization

## Docker

## Docker Compose

---

# CI/CD

## GitHub Actions

---

# Monitoring

## Monitoring Stack

* Prometheus
* Grafana

---

# Logging

## Logs

* Loki
* Winston

---

# 5. High-Level Architecture

```text
Client Apps
(Web + Android)
        │
        ▼
Nginx Reverse Proxy
        │
 ┌───────────────┐
 │ Fastify API   │
 │ Socket.IO     │
 └───────────────┘
        │
 ┌───────────────┐
 │ Redis         │
 └───────────────┘
        │
 ┌───────────────┐
 │ PostgreSQL    │
 └───────────────┘
        │
 ┌───────────────┐
 │ MinIO Storage │
 └───────────────┘
        │
 ┌───────────────┐
 │ Coturn Server │
 └───────────────┘
```

---

# 6. Realtime Messaging Architecture

## WebSocket Events

### Client → Server

```json
{
  "event": "send_message",
  "data": {
    "chatId": "123",
    "message": "Hello"
  }
}
```

---

### Server → Client

```json
{
  "event": "new_message",
  "data": {
    "id": "msg_123",
    "message": "Hello"
  }
}
```

---

# 7. Voice Calling Flow

```text
Caller starts call
↓
Socket.IO sends offer
↓
Receiver gets incoming call
↓
Receiver accepts
↓
SDP answer exchanged
↓
ICE candidates exchanged
↓
Peer connection established
↓
Audio stream starts
```

---

# 8. Database Schema (Core)

# Users

```sql
users
- id
- email
- username
- password_hash
- avatar
- bio
- status
- created_at
```

---

# Chats

```sql
chats
- id
- type (private/group)
- created_at
```

---

# Chat Members

```sql
chat_members
- id
- chat_id
- user_id
```

---

# Messages

```sql
messages
- id
- chat_id
- sender_id
- message
- type
- created_at
- delivered_at
- read_at
```

---

# Calls

```sql
calls
- id
- caller_id
- receiver_id
- started_at
- ended_at
- status
```

---

# 9. Authentication Flow

```text
User login
↓
JWT issued
↓
Refresh token stored securely
↓
Client connects to Socket.IO with JWT
↓
Socket authenticated
```

---

# 10. Security Requirements

## Must Have

* HTTPS everywhere
* JWT expiration
* Refresh token rotation
* Rate limiting
* WebSocket auth
* SQL injection prevention
* XSS protection
* CSRF protection
* Secure file upload validation

---

# 11. Scalability Strategy

## Horizontal Scaling

Use:

* Redis adapter for Socket.IO
* Multiple API instances
* Load balancer

---

# 12. Folder Structure

# Backend

```text
backend/
 ├── src/
 │   ├── modules/
 │   ├── sockets/
 │   ├── auth/
 │   ├── calls/
 │   ├── chats/
 │   ├── users/
 │   ├── uploads/
 │   └── utils/
```

---

# Frontend Web

```text
web/
 ├── src/
 │   ├── components/
 │   ├── pages/
 │   ├── store/
 │   ├── hooks/
 │   ├── services/
 │   └── sockets/
```

---

# Mobile

```text
mobile/
 ├── src/
 │   ├── screens/
 │   ├── components/
 │   ├── hooks/
 │   ├── services/
 │   └── webrtc/
```

---

# 13. APIs

## Auth

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

---

## Users

```text
GET /users/me
GET /users/:id
PUT /users/me
```

---

## Chats

```text
GET /chats
POST /chats
GET /messages/:chatId
```

---

# 14. Socket Events

## Messaging

```text
send_message
new_message
typing_start
typing_stop
message_read
```

---

## Calling

```text
call_offer
call_answer
ice_candidate
call_reject
call_end
```

---

# 15. Deployment Requirements

# Minimum VPS

## MVP

* 4 CPU
* 8 GB RAM
* 100 GB SSD

---

# Production

* Dedicated Coturn server
* Dedicated PostgreSQL
* Dedicated Redis

---

# 16. Docker Services

```yaml
services:
  - nginx
  - api
  - postgres
  - redis
  - minio
  - coturn
```

---

# 17. Future Roadmap

## Phase 2

* Video calling
* Group voice calls
* End-to-end encryption
* Stories/status
* Screen sharing

---

## Phase 3

* AI assistant
* SIP calling
* AI voice agents
* Meeting rooms
* Live streaming

---

# 18. Recommended Development Phases

# Phase 1

* Auth
* Chat
* WebSocket
* Basic UI

---

# Phase 2

* Voice calls
* Push notifications
* Media uploads

---

# Phase 3

* Android optimization
* Admin dashboard
* Scaling

---



```text
Build a production-grade self-hosted real-time chat and voice calling application using:

Frontend:
- React + Vite
- TailwindCSS
- Zustand

Mobile:
- React Native

Backend:
- Node.js
- Fastify
- Socket.IO

Database:
- PostgreSQL

Cache:
- Redis

Storage:
- MinIO

Voice Calling:
- WebRTC
- Coturn

Requirements:
- JWT authentication
- Real-time messaging
- One-to-one voice calls
- Push notifications
- Dockerized setup
- Clean scalable architecture
- TypeScript everywhere
- Prisma ORM
- Modern responsive UI
- Admin dashboard
- Production-ready code
```
