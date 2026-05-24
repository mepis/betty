# Password Hashing

**Tags:** `backend`, `auth`, `password`, `bcrypt`, `security`, `hashing`

## Overview

The password module (`src/backend/auth/password.js`) provides password hashing and comparison using `bcryptjs` with 10 salt rounds.

## API Reference

### `hashPassword(password: string): Promise<string>`

Hash a plaintext password using bcrypt.

- **Throws** if password is empty or shorter than 6 characters
- Returns a bcrypt hash string

### `comparePassword(password: string, hash: string): Promise<boolean>`

Compare a plaintext password against a stored bcrypt hash. Returns `true` if they match.

## Configuration

| Constant | Value | Description |
|---|---|---|
| `SALT_ROUNDS` | `10` | Bcrypt cost factor |

## Usage

```js
// Registration
const hash = await hashPassword(userInputPassword);
UserRepo.create(username, email, hash);

// Login
const user = UserRepo.findByUsername(username);
const valid = await comparePassword(inputPassword, user.password_hash);
```

## Related

- [[Auth Routes]] — Uses `hashPassword()` for registration, `comparePassword()` for login
- [[Users Routes]] — Uses `hashPassword()` when updating user passwords
- [[JWT Authentication]] — Session creation after successful password verification
