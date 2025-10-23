# Error Handling & Logging

**Milestone:** Phase 1: Foundation
**Labels:** enhancement, logging, error-handling

---

## 📋 Context

The current implementation uses simple `console.log()` and `console.error()` statements which are not suitable for production. We need structured logging, proper error handling, and error tracking for production monitoring.

**Current State:**
- Simple `console.log()` logging
- No structured logging format
- No log levels
- No error tracking
- Try-catch blocks scattered inconsistently
- No centralized error handling

**Target State:**
- Structured logging with Winston
- Log levels (debug, info, warn, error)
- Centralized error handling
- Error tracking with Sentry (optional)
- Request/response logging
- Performance monitoring
- Error context and stack traces

---

## 🎯 Objective

Implement comprehensive error handling and structured logging throughout the application, with optional error tracking integration for production monitoring.

---

## 🔧 Technical Specifications

### Logging with Winston

Install dependencies:

```bash
npm install winston
npm install --save-dev @types/winston
```

Create `src/utils/logger.ts`:

```typescript
import winston from 'winston';

/**
 * Log levels:
 * - error: Error messages
 * - warn: Warning messages
 * - info: Informational messages
 * - debug: Debug messages (not shown in production)
 */

const logLevel = process.env.LOG_LEVEL || (
  process.env.NODE_ENV === 'production' ? 'info' : 'debug'
);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'pp-bot' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
  ],
});

// Log unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

export default logger;
```

### Error Classes

Create `src/errors/index.ts`:

```typescript
/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database operation error
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500);
    this.name = 'DatabaseError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Slack API error
 */
export class SlackAPIError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode);
    this.name = 'SlackAPIError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

/**
 * Configuration error
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 500, false); // Not operational - requires fix
    this.name = 'ConfigError';
  }
}
```

### Error Handler Middleware

Create `src/middleware/errorHandler.ts`:

```typescript
import { logger } from '../utils/logger';
import { AppError } from '../errors';

/**
 * Centralized error handler
 */
export async function handleError(error: Error, context?: any): Promise<void> {
  if (error instanceof AppError) {
    // Known operational error
    logger.error('Operational error:', {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      context,
    });
  } else {
    // Unknown error - log full details
    logger.error('Unexpected error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  // Optionally send to error tracking service (Sentry)
  if (process.env.SENTRY_DSN) {
    // Sentry.captureException(error);
  }
}

/**
 * Wrap async functions with error handling
 */
export function asyncHandler<T>(
  fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error as Error, { function: fn.name, args });
      throw error;
    }
  };
}
```

### Update Bot Logic

Update `src/index.ts`:

```typescript
import { App, LogLevel } from '@slack/bolt';
import { logger } from './utils/logger';
import { handleError } from './middleware/errorHandler';
import { DatabaseError, SlackAPIError } from './errors';

// Replace all console.log with logger
// Before: console.log('⚡️ PP Bot is running!');
// After:  logger.info('PP Bot is running');

// Message handler with error handling
app.message(/<@[A-Z0-9]+>\s*(\+\+|--)/, async ({ message, say }) => {
  try {
    logger.debug('Processing vote message', { 
      user: message.user,
      text: message.text 
    });

    // ... vote processing logic ...

    logger.info('Vote processed successfully', {
      user: message.user,
      votes: votes.length,
    });
  } catch (error) {
    logger.error('Failed to process vote', {
      error: error.message,
      user: message.user,
    });
    
    await handleError(error as Error, { message });
    
    try {
      await say('❌ Sorry, something went wrong processing your vote. Please try again.');
    } catch (sayError) {
      logger.error('Failed to send error message', { error: sayError });
    }
  }
});

// Database operations with error handling
export async function updateUserScore(userId: string, action: string): Promise<number> {
  try {
    logger.debug('Updating user score', { userId, action });
    
    const result = await pool.query(/* ... */);
    
    logger.debug('Score updated', { userId, newScore: result.rows[0].score });
    return result.rows[0].score;
  } catch (error) {
    throw new DatabaseError(
      `Failed to update score for user ${userId}`,
      error as Error
    );
  }
}
```

### Optional: Sentry Integration

Install Sentry:

```bash
npm install @sentry/node
```

Create `src/utils/sentry.ts`:

```typescript
import * as Sentry from '@sentry/node';
import { logger } from './logger';

export function initSentry(): void {
  if (!process.env.SENTRY_DSN) {
    logger.info('Sentry DSN not configured, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
    
    beforeSend(event, hint) {
      // Log to Winston as well
      logger.error('Sentry event', {
        eventId: event.event_id,
        message: hint.originalException,
      });
      return event;
    },
  });

  logger.info('Sentry initialized');
}
```

### Performance Logging

Create `src/utils/performance.ts`:

```typescript
import { logger } from './logger';

/**
 * Measure function execution time
 */
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return fn().finally(() => {
    const duration = Date.now() - start;
    logger.debug('Performance measurement', { name, duration });
    
    if (duration > 1000) {
      logger.warn('Slow operation detected', { name, duration });
    }
  });
}

/**
 * Performance decorator
 */
export function performance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function(...args: any[]) {
    return measurePerformance(
      `${target.constructor.name}.${propertyName}`,
      () => method.apply(this, args)
    );
  };
}
```

---

## ✅ Acceptance Criteria

- [ ] Winston logger configured
- [ ] Log levels properly implemented (debug, info, warn, error)
- [ ] Structured logging format (JSON in production)
- [ ] Custom error classes created
- [ ] Centralized error handler implemented
- [ ] All console.log replaced with logger
- [ ] Database errors wrapped with DatabaseError
- [ ] Slack API errors wrapped with SlackAPIError
- [ ] Unhandled rejections logged
- [ ] Uncaught exceptions logged
- [ ] Error context included in logs
- [ ] Performance logging added for slow operations
- [ ] Optional Sentry integration added
- [ ] Error messages user-friendly in Slack
- [ ] Tests for error handling
- [ ] Documentation updated

---

## 📚 Reference Documentation

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Node.js Error Handling Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

## 🔗 Dependencies

**Blocks:** None

**Blocked By:** None

---

## 💡 Implementation Notes

### Log Levels Usage

- **debug**: Detailed information for debugging
- **info**: General informational messages
- **warn**: Warning messages for recoverable issues
- **error**: Error messages for failures

### Security Considerations

1. **Never log sensitive data**: Passwords, tokens, etc.
2. **Sanitize user input**: Before logging
3. **Rate limit logs**: Prevent log flooding
4. **Secure log storage**: Protect log files

### Performance

1. **Async logging**: Winston handles this automatically
2. **Log sampling**: Sample debug logs in production
3. **Log rotation**: Use winston-daily-rotate-file for log rotation

---

## 📅 Estimated Effort

**Time Estimate:** 3-4 hours

- Winston setup: 1 hour
- Error classes: 0.5 hours
- Update existing code: 1.5 hours
- Testing: 0.5 hours
- Sentry integration (optional): 0.5 hours
- Documentation: 0.5 hours
