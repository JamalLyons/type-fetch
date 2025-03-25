# type-fetch

A lightweight, zero-dependency HTTP client library for making type-safe API requests in JavaScript/TypeScript.

[![npm version](https://badge.fury.io/js/%40thatguyjamal%2Ftype-fetch.svg)](https://badge.fury.io/js/%40thatguyjamal%2Ftype-fetch)
[![Downloads](https://img.shields.io/npm/dt/%40thatguyjamal%2Ftype-fetch.svg)](https://npmjs.org/package/%40thatguyjamal%2Ftype-fetch)

## 🌟 Features

- **Type-Safe**: Full TypeScript support with comprehensive type inference
- **Zero Dependencies**: Lightweight and fast
- **Flexible Configuration**: Highly customizable request handling
- **Retry Mechanism**: Built-in request retry logic
- **Caching Support**: Optional response caching for GET requests
- **Multiple Content Types**: Support for JSON, Form, Text, Blob, Multipart, XML, and HTML

## 📦 Installation

```bash
npm install @thatguyjamal/type-fetch
# or
yarn add @thatguyjamal/type-fetch
# or
pnpm add @thatguyjamal/type-fetch
# or
bun add @thatguyjamal/type-fetch
```

### Compatibility

- **TypeScript**: `>=4.5.0`
- **Node.js**: `>=16.0.0`
- **Browsers**: All modern browsers (Chrome, Firefox, Safari, Edge)

## 🚀 Quick Start

### Basic Usage

```typescript
import { TFetchClient } from '@thatguyjamal/type-fetch';

// Create a client instance
const client = new TFetchClient();

// GET Request
interface User {
  id: number;
  name: string;
}

const { data, error } = await client.get<User>('https://api.example.com/users/1');
if (error) {
  console.error('Request failed:', error);
} else {
  console.log('User:', data);
}

// POST Request
const { data: newUser, error: postError } = await client.post<User>(
  'https://api.example.com/users', 
  { type: 'json', data: { name: 'John Doe' } }
);
```

## 🔧 Advanced Configuration

### Client Options

```typescript
const client = new TFetchClient({
  // Enable debug logging
  debug: true,

  // Default headers for all requests
  headers: { 'Authorization': 'Bearer token' },

  // Retry mechanism
  retry: {
    count: 3,           // Number of retry attempts
    delay: 1000,        // Delay between retries (ms)
    onRetry: () => {    // Optional callback on each retry
      console.log('Retrying request...');
    }
  },

  // Caching for GET requests
  cache: {
    enabled: true,      // Enable caching
    maxAge: 5 * 60000,  // Cache expiration (5 minutes)
    maxCachedEntries: 100 // Maximum number of cached entries
  },

  // Customize DELETE request handling
  deleteHandling: 'status' // 'empty' | 'status' | 'json'
});
```

## 🚀 Advanced Caching

Type-fetch provides a powerful and flexible caching mechanism for all HTTP methods:

```typescript
// Global cache configuration
const client = new TFetchClient({
  cache: {
    enabled: true,     // Enable caching globally
    maxAge: 5 * 60 * 1000, // 5 minutes default cache time
    maxCachedEntries: 1000 // Maximum number of cache entries
  }
});

// Per-request cache configuration
const result = await client.get<User>('/users/1', {
  cache: {
    enabled: true,     // Override global cache setting
    maxAge: 10 * 60 * 1000 // Custom cache time for this request
  }
});
```

### Caching Features
- Support for caching all HTTP methods (GET, POST, PUT, DELETE, etc.)
- Intelligent cache key generation based on URL, method, headers, and body
- Configurable global and per-request cache settings
- Automatic cache cleanup to prevent memory overflow

#### POST Request Caching
```typescript
// Create a new user with caching
const result = await client.post<User>('/users', 
  { type: 'json', data: { name: 'John Doe', email: 'john@example.com' } },
  {
    cache: {
      enabled: true,     // Cache the POST request
      maxAge: 15 * 60 * 1000 // Cache for 15 minutes
    }
  }
);
```

#### PATCH Request Caching
```typescript
// Update user profile with caching
const result = await client.patch<User>('/users/123', 
  { type: 'json', data: { name: 'Jane Smith' } },
  {
    cache: {
      enabled: true,     // Cache the PATCH request
      maxAge: 10 * 60 * 1000 // Cache for 10 minutes
    }
  }
);
```

## 📡 Supported HTTP Methods

- `get<T>()`: Retrieve resources
- `post<T>()`: Create new resources
- `put<T>()`: Update existing resources
- `patch<T>()`: Partially update resources
- `delete<T>()`: Remove resources
- `head<T>()`: Retrieve headers only

## 🌈 Content Types

Supported content types for requests:

- `json`: JSON data
- `form`: URL-encoded form data
- `text`: Plain text
- `blob`: Binary data
- `multipart`: Form data with files
- `xml`: XML documents
- `html`: HTML documents

### Example with Different Content Types

```typescript
// JSON
await client.post('https://api.example.com/users', { 
  type: 'json', 
  data: { name: 'John' } 
});

// Multipart Form Data
const formData = new FormData();
formData.append('file', fileBlob, 'avatar.png');
await client.post('https://api.example.com/upload', { 
  type: 'multipart', 
  data: formData 
});
```

## 🛡️ Error Handling

The library provides a robust `TFetchError` with additional context:

```typescript
interface Result<T> {
  data: T | null;
  error: TFetchError | null;
}

// Error properties
error.message    // Error description
error.statusCode // HTTP status code
```

## 🔍 DELETE Request Handling

Customize how DELETE requests are handled:

```typescript
// 'empty' (default): Returns { data: null, error: null }
// 'status': Returns { data: statusCode, error: null }
// 'json': Attempts to parse JSON response
const client = new TFetchClient({ deleteHandling: 'status' });
```

## 📝 License

[MIT License](https://opensource.org/licenses/MIT)

For the full license text, see the [LICENSE](LICENSE) file in the repository.

## 💬 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/thatguyjamal/type-fetch/issues) on GitHub.

## 🐛 Issues & Contributions

Found a bug? Want to contribute? Please open an issue or submit a pull request on [GitHub](https://github.com/thatguyjamal/type-fetch).

## 🔗 Additional Resources

- [GitHub Repository](https://github.com/thatguyjamal/type-fetch)
- [npm Package](https://www.npmjs.com/package/@thatguyjamal/type-fetch)